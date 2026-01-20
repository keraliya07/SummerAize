import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { authAPI } from '../../services/api';
import logo from '../../assets/logo.svg';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const confirmed = window.confirm('Are you sure you want to reset your password?');
    if (!confirmed) return;
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      toast.success('If the email exists, a reset link has been sent.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950"></div>
      <Card className="w-full max-w-md glass-card animate-fade-in">
        <CardHeader className="text-center space-y-2 md:space-y-3 py-4 md:py-6">
          <div className="mx-auto w-12 h-12 md:w-14 md:h-14 flex items-center justify-center">
            <img src={logo} alt="SummerAize Logo" className="w-12 h-12 md:w-14 md:h-14" />
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold gradient-text">Forgot Password</CardTitle>
          <CardDescription className="text-sm md:text-base text-gray-300">Enter your email to receive a reset link</CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-200">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full h-12 bg-gray-800/60 border-gray-600 text-gray-100 placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500/20"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 md:h-12 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm md:text-base">
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;


