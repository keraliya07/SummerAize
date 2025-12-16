import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleGoogleCallback } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;

    const token = searchParams.get('token');
    const userParam = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      toast.error(decodeURIComponent(error));
      navigate('/login', { replace: true });
      return;
    }

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        const result = handleGoogleCallback(token, user);
        
        if (result.success) {
          hasProcessed.current = true;
          toast.success('Login successful!');
          
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 800);
        } else {
          toast.error(result.error || 'Failed to complete authentication');
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Error parsing user data:', err);
        toast.error('Failed to complete authentication');
        navigate('/login', { replace: true });
      }
    } else {
      toast.error('Authentication failed - missing token or user data');
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate, handleGoogleCallback]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-300">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;

