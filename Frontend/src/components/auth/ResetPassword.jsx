import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { authAPI } from '../../services/api';
import logo from '../../assets/logo.svg';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

const ResetPassword = () => {
  const query = useQuery();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const qEmail = query.get('email') || '';
    const qToken = query.get('token') || '';
    setEmail(qEmail);
    setToken(qToken);
  }, [query]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, token, newPassword: password });
      toast.success('Password reset successful');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
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
          <CardTitle className="text-xl md:text-2xl font-bold gradient-text">Reset Password</CardTitle>
          <CardDescription className="text-sm md:text-base text-gray-300">Enter a new password for {email}</CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-200">New password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full h-12 bg-gray-800/60 border-gray-600 text-gray-100 placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500/20" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm font-medium text-gray-200">Confirm password</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="w-full h-12 bg-gray-800/60 border-gray-600 text-gray-100 placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500/20" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 md:h-12 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm md:text-base">
              {loading ? 'Resetting...' : 'Reset password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;



