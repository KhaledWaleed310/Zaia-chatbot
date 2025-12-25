import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { auth } from '../utils/api';

const ForgotPassword = () => {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await auth.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-2xl mb-4">
                <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('forgotPassword.success.title')}</h2>
              <p className="text-sm sm:text-base text-gray-500 mt-3">
                {t('forgotPassword.success.message', { email })}
              </p>
              <p className="text-sm text-gray-400 mt-4">
                {t('forgotPassword.linkExpiry', 'The link will expire in 1 hour.')}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 mt-6 text-blue-600 font-medium hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('forgotPassword.backToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl mb-4">
              <Mail className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('forgotPassword.title')}</h2>
            <p className="text-sm sm:text-base text-gray-500 mt-2">
              {t('forgotPassword.subtitle')}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('forgotPassword.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base min-h-[44px]"
                placeholder={t('forgotPassword.emailPlaceholder')}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 min-h-[44px] text-sm sm:text-base"
            >
              {loading ? t('forgotPassword.sending') : t('forgotPassword.sendLink')}
            </button>
          </form>

          <Link
            to="/login"
            className="mt-5 sm:mt-6 flex items-center justify-center gap-2 text-sm sm:text-base text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
