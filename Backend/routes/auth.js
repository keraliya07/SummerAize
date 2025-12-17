const express = require('express')
const crypto = require('crypto')
const validate = require('../middleware/validate')
const { signupValidator, loginValidator } = require('../validators/userValidators')
const { addUser } = require('../services/userService')
const { login } = require('../services/authService')
const { loginLimiter } = require('../middleware/rateLimiters')
const auth = require('../middleware/auth')
const User = require('../models/User')
const AppError = require('../utils/AppError')
const { sendResetPasswordEmail } = require('../services/emailService')
const { checkTokenHealth } = require('../services/googleAuth')
const { getAuthUrl, getUserInfo, findOrCreateGoogleUser } = require('../services/googleOAuthService')
const { signToken } = require('../utils/jwt')
const { getFrontendUrl } = require('../utils/urlConfig')

const router = express.Router()

function getSafeFrontendUrl() {
  try {
    return getFrontendUrl();
  } catch (err) {
    console.warn('⚠️  Frontend URL not configured, using localhost fallback');
    return 'http://localhost:5173';
  }
}

// Create a new user account
// Method: POST /signup
// Body: { username, email, password }
// Returns: { user, message }
router.post('/signup', signupValidator, validate, async (req, res, next) => {
  try {
    const { username, email, password } = req.body
    const user = await addUser({ username, email, password })
    const safe = { 
      id: user._id, 
      username: user.username, 
      email: user.email, 
      role: user.role, 
      createdAt: user.createdAt, 
      updatedAt: user.updatedAt 
    }
    res.status(201).json({ 
      user: safe,
      message: 'Account created successfully! Welcome email sent to your inbox.'
    })
  } catch (err) {
    next(err)
  }
})

// Log in and receive a JWT
// Method: POST /login
// Body: { email, password }
// Returns: { user, token }
router.post('/login', loginLimiter, loginValidator, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body
    const result = await login({ email, password })
    res.status(200).json({ 
      user: { 
        id: result.user._id, 
        username: result.user.username, 
        email: result.user.email, 
        role: result.user.role
      }, 
      token: result.token 
    })
  } catch (err) {
    next(err)
  }
})

// Get current authenticated user
// Method: GET /me
// Returns: { user }
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean()
    if (!user) return res.status(404).json({ message: 'User not found' })
    const safe = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
    res.status(200).json({ user: safe })
  } catch (err) {
    next(err)
  }
})

// Request password reset - send email with token
// Method: POST /forgot-password
// Body: { email }
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body || {}
    if (!email) return res.status(400).json({ message: 'Email is required' })

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: 'Email not found. Please enter a valid email' })
    }

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    user.resetPasswordToken = tokenHash
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await user.save()

    const siteUrl = getSafeFrontendUrl()
    const resetUrl = `${siteUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`
    try {
      await sendResetPasswordEmail(email, resetUrl)
    } catch (mailErr) {
      console.error('Failed to send reset email (continuing):', mailErr && mailErr.message ? mailErr.message : mailErr)
      // Intentionally do not reveal failure to avoid user enumeration / leaking config
    }

    res.status(200).json({ message: 'Reset link sent to your email' })
  } catch (err) {
    next(err)
  }
})

// Reset password using token
// Method: POST /reset-password
// Body: { email, token, newPassword }
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body || {}
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: 'Email, token and newPassword are required' })
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' })
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({ 
      email, 
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() }
    })

    if (!user) {
      return res.status(400).json({ message: 'This reset link has expired. Please try requesting a new password reset' })
    }

    user.passwordHash = await User.hashPassword(newPassword)
    user.resetPasswordToken = null
    user.resetPasswordExpires = null
    await user.save()

    res.status(200).json({ message: 'Password has been reset successfully' })
  } catch (err) {
    next(err)
  }
})

router.get('/oauth-health', auth, async (req, res, next) => {
  try {
    const health = await checkTokenHealth()
    res.status(health.healthy ? 200 : 503).json(health)
  } catch (err) {
    next(err)
  }
})

router.get('/auth/google', async (req, res, next) => {
  try {
    const authUrl = getAuthUrl()
    if (!authUrl) {
      throw new Error('Failed to generate Google OAuth URL')
    }
    console.log('Google OAuth URL generated:', authUrl.substring(0, 100) + '...')
    res.redirect(authUrl)
  } catch (err) {
    console.error('Error generating Google OAuth URL:', err.message || err)
    const frontendUrl = getSafeFrontendUrl()
    try {
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Failed to initiate Google login. Please check server configuration.')}`)
    } catch (redirectErr) {
      console.error('Error redirecting:', redirectErr)
      next(err)
    }
  }
})

router.get('/auth/google/callback', async (req, res, next) => {
  try {
    const { code, error, error_description } = req.query

    if (error) {
      console.error('Google OAuth error:', error, error_description)
      const frontendUrl = getSafeFrontendUrl()
      let errorMessage = 'Google authentication failed'
      
      if (error === 'access_denied') {
        errorMessage = 'Access denied. Please grant the required permissions to continue.'
      } else if (error === 'redirect_uri_mismatch') {
        errorMessage = 'Redirect URI mismatch. Please contact the administrator.'
      } else if (error_description) {
        try {
          errorMessage = decodeURIComponent(error_description)
        } catch (e) {
          errorMessage = error_description
        }
      }
      
      try {
        return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`)
      } catch (redirectErr) {
        console.error('Error redirecting on OAuth error:', redirectErr)
        return next(new Error(errorMessage))
      }
    }

    if (!code) {
      const frontendUrl = getSafeFrontendUrl()
      try {
        return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Google authentication failed')}`)
      } catch (redirectErr) {
        console.error('Error redirecting on missing code:', redirectErr)
        return next(new Error('Google authentication failed'))
      }
    }

    const userInfo = await getUserInfo(code)
    if (!userInfo || !userInfo.email) {
      throw new Error('Failed to retrieve user information from Google')
    }

    const user = await findOrCreateGoogleUser(userInfo)
    if (!user || !user._id) {
      throw new Error('Failed to create or find user account')
    }

    const token = signToken({ id: user._id.toString(), role: user.role })
    if (!token) {
      throw new Error('Failed to generate authentication token')
    }

    const frontendUrl = getSafeFrontendUrl()
    const tokenParam = encodeURIComponent(token)
    const userParam = encodeURIComponent(JSON.stringify({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role
    }))

    try {
      res.redirect(`${frontendUrl}/auth/callback?token=${tokenParam}&user=${userParam}`)
    } catch (redirectErr) {
      console.error('Error redirecting on success:', redirectErr)
      next(new Error('Authentication successful but redirect failed'))
    }
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    const frontendUrl = getSafeFrontendUrl()
    try {
      const errorMessage = err.message || 'Authentication failed. Please try again.'
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`)
    } catch (redirectErr) {
      console.error('Error redirecting on exception:', redirectErr)
      next(err)
    }
  }
})

module.exports = router
