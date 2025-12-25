import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../utils/api';
import { MessageSquare, Mail, CheckCircle } from 'lucide-react';
import { trackEvent, EVENTS } from '../utils/tracking';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setResendSuccess(false);
    setLoading(true);

    try {
      await login(email, password);
      // Track successful login
      trackEvent(EVENTS.LOGIN);
      navigate('/dashboard');
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail || 'Login failed';

      // Check if email is not verified (403)
      if (status === 403 && detail.toLowerCase().includes('verify')) {
        setNeedsVerification(true);
      }
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      await auth.resendVerification(email);
      setResendSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl mb-4">
              <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-sm sm:text-base text-gray-500 mt-2">Sign in to your Aiden Link account</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}

          {needsVerification && !resendSuccess && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-800 font-medium">Email not verified</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Please check your inbox for the verification link.
                  </p>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading || !email}
                    className="mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900 underline disabled:opacity-50"
                  >
                    {resendLoading ? 'Sending...' : 'Resend verification email'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {resendSuccess && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-green-800 font-medium">Verification email sent!</p>
                  <p className="text-xs text-green-700 mt-1">
                    Please check your inbox and click the verification link.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base min-h-[44px]"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base min-h-[44px]"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 min-h-[44px] text-sm sm:text-base"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 sm:mt-6 text-center text-sm sm:text-base text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
