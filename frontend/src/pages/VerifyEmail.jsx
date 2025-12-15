import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react';
import { auth } from '../utils/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // verifying, success, error, no-token
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await auth.verifyEmail(token);
        setStatus('success');
        setMessage(response.data.message);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Failed to verify email. The link may have expired.');
      }
    };

    verifyEmail();
  }, [token]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl mb-4">
                <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Verifying your email...</h2>
              <p className="text-sm sm:text-base text-gray-500 mt-3">
                Please wait while we verify your email address.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-2xl mb-4">
                <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Email Verified!</h2>
              <p className="text-sm sm:text-base text-gray-500 mt-3">
                {message}
              </p>
              <Link
                to="/login"
                className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Sign in to your account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'no-token') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-yellow-100 rounded-2xl mb-4">
                <Mail className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">No verification token</h2>
              <p className="text-sm sm:text-base text-gray-500 mt-3">
                Please check your email for the verification link, or request a new one.
              </p>
              <Link
                to="/login"
                className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Go to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-red-100 rounded-2xl mb-4">
              <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Verification Failed</h2>
            <p className="text-sm sm:text-base text-gray-500 mt-3">
              {message}
            </p>
            <div className="mt-6 space-y-3">
              <Link
                to="/login"
                className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Go to login
              </Link>
              <p className="text-sm text-gray-500">
                Need a new link?{' '}
                <Link to="/login" className="text-blue-600 hover:underline">
                  Request verification email
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
