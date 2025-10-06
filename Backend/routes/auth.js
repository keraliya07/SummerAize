const express = require('express')
const validate = require('../middleware/validate')
const { signupValidator, loginValidator } = require('../validators/userValidators')
const { addUser } = require('../services/userService')
const { login } = require('../services/authService')
const { loginLimiter } = require('../middleware/rateLimiters')
const auth = require('../middleware/auth')
const User = require('../models/User')

const router = express.Router()

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

module.exports = router
