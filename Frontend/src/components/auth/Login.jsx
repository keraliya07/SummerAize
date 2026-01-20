import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import logo from '../../assets/logo.svg';

const Login = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      toast.error(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData);
    
    if (result.success) {
      toast.success('Login successful!');
      navigate('/dashboard');
    } else {
      setError(result.error);
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  const handleGoogleLogin = () => {
    try {
      setLoading(true);
      setError('');
      
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      if (!API_BASE_URL) {
        throw new Error('API URL is not configured');
      }
      
      const baseUrl = API_BASE_URL.replace(/\/+$/, '');
      window.location.href = `${baseUrl}/auth/google`;
    } catch (error) {
      console.error('Google login error:', error);
      const errorMessage = error.message || 'Failed to initiate Google login';
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950"></div>
      {/* background accents removed */}
      
      <Card className="w-full max-w-md mx-auto glass-card animate-fade-in">
        <CardHeader className="text-center space-y-2 md:space-y-3 py-4 md:py-6">
          <div className="mx-auto w-12 h-12 md:w-14 md:h-14 flex items-center justify-center">
            <img src={logo} alt="SummerAize Logo" className="w-12 h-12 md:w-14 md:h-14" />
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold gradient-text">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-sm md:text-base text-gray-300">
            Sign in to your SummerAize account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-5 px-4 md:px-6 pb-4 md:pb-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-200">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                className="w-full h-10 bg-gray-800/60 border-gray-600 text-gray-100 placeholder:text-gray-400 focus:border-gray-600 transition-all duration-300"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="password" className="text-sm font-medium text-gray-200">Password</Label>
                <Link
                  to="/forgot-password"
                  className="ml-auto text-xs text-purple-300 hover:text-purple-200 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="w-full h-10 bg-gray-800/60 border-gray-600 text-gray-100 placeholder:text-gray-400 focus:border-gray-600 transition-all duration-300 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors duration-200 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-300 text-sm bg-red-900/30 p-3 rounded-lg border border-red-800/60">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 md:h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg text-sm md:text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="flex justify-center">
            <span className="text-sm text-gray-400">or continue with</span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-11 md:h-12 bg-gray-800/60 border-gray-600 text-gray-100 hover:bg-gray-700/60 hover:text-white transition-all duration-300 text-sm md:text-base"
          >
            <svg className="mr-2 h-4 w-4 md:h-5 md:w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Login with Google
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-300">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-purple-300 hover:text-purple-200 font-semibold transition-colors duration-200"
              >
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
