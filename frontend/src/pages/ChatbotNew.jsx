import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { chatbots } from '../utils/api';
import { MessageSquare } from 'lucide-react';

const ChatbotNew = () => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    system_prompt: 'You are a helpful assistant. Answer questions based on the provided context. If you do not know the answer, say so politely.',
    welcome_message: 'Hello! How can I help you today?',
    primary_color: '#3B82F6',
    text_color: '#FFFFFF',
    position: 'bottom-right',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await chatbots.create(formData);
      navigate(`/chatbots/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create chatbot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{t('chatbots.createNew', 'Create New Chatbot')}</h1>
          <p className="text-gray-500 mt-1">{t('chatbots.configureSettings', 'Configure your AI chatbot settings')}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('chatbots.name', 'Chatbot Name')} *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('chatbots.namePlaceholder', 'My Support Bot')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('chatbots.systemPrompt', 'System Prompt')}
            </label>
            <textarea
              name="system_prompt"
              value={formData.system_prompt}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('chatbots.systemPromptPlaceholder', 'Instructions for the AI...')}
            />
            <p className="mt-1 text-sm text-gray-500">
              {t('chatbots.systemPromptHelp', 'Define how the AI should behave and respond')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('chatbots.welcomeMessage', 'Welcome Message')}
            </label>
            <input
              type="text"
              name="welcome_message"
              value={formData.welcome_message}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('chatbots.welcomePlaceholder', 'Hello! How can I help you?')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('chatbots.primaryColor', 'Primary Color')}
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  name="primary_color"
                  value={formData.primary_color}
                  onChange={handleChange}
                  className="w-12 h-12 rounded-lg cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData((prev) => ({ ...prev, primary_color: e.target.value }))}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('chatbots.textColor', 'Text Color')}
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  name="text_color"
                  value={formData.text_color}
                  onChange={handleChange}
                  className="w-12 h-12 rounded-lg cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={formData.text_color}
                  onChange={(e) => setFormData((prev) => ({ ...prev, text_color: e.target.value }))}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('chatbots.widgetPosition', 'Widget Position')}
            </label>
            <select
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="bottom-right">{t('chatbots.bottomRight', 'Bottom Right')}</option>
              <option value="bottom-left">{t('chatbots.bottomLeft', 'Bottom Left')}</option>
            </select>
          </div>

          {/* Preview */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">{t('chatbots.preview', 'Preview')}</h3>
            <div className="bg-gray-100 rounded-lg p-6 flex justify-end">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                style={{ backgroundColor: formData.primary_color }}
              >
                <MessageSquare className="w-6 h-6" style={{ color: formData.text_color }} />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/chatbots')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? t('chatbots.creating', 'Creating...') : t('chatbots.create', 'Create Chatbot')}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default ChatbotNew;
