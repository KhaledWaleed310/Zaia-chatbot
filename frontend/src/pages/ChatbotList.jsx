import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { chatbots } from '../utils/api';
import { MessageSquare, Plus, Trash2, Settings, ExternalLink, Eye, Globe, Lock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Switch } from '@/components/ui/switch';

const ChatbotList = () => {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const { isRtl } = useLanguage();
  const location = useLocation();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadChatbots = async () => {
    try {
      setLoading(true);
      const response = await chatbots.list();
      setBots(response.data);
    } catch (error) {
      console.error('Failed to load chatbots:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChatbots();
  }, [location.key]); // Reload whenever route changes (including navigation back to chatbots list)

  const handleDelete = async (id, name) => {
    if (!confirm(`${tc('messages.confirmDelete')} ${tc('messages.cannotUndo')}`)) {
      return;
    }

    try {
      await chatbots.delete(id);
      setBots(bots.filter((bot) => bot.id !== id));
    } catch (error) {
      console.error('Failed to delete chatbot:', error);
    }
  };

  const handleTogglePublic = async (bot) => {
    try {
      const newPublicState = !bot.is_public;
      await chatbots.update(bot.id, { is_public: newPublicState });
      setBots(bots.map(b => b.id === bot.id ? { ...b, is_public: newPublicState } : b));
    } catch (error) {
      console.error('Failed to toggle public status:', error);
    }
  };

  const getShareUrl = (botId) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/chat/${botId}`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('chatbots.title')}</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">{t('chatbots.subtitle')}</p>
          </div>
          <Link
            to="/chatbots/new"
            className="flex items-center justify-center px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] text-sm sm:text-base"
          >
            <Plus className="w-5 h-5 me-2" />
            {t('chatbots.newChatbot')}
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 text-center text-sm sm:text-base text-gray-500">
            {tc('messages.loading')}
          </div>
        ) : bots.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center">
            <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">{t('dashboard.noChatbots.title')}</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-6">
              {t('dashboard.noChatbots.description')}
            </p>
            <Link
              to="/chatbots/new"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px] text-sm sm:text-base"
            >
              <Plus className="w-5 h-5 me-2" />
              {t('dashboard.noChatbots.cta')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {bots.map((bot) => (
              <div key={bot.id} className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 sm:p-6 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: bot.primary_color || '#3B82F6' }}
                      >
                        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="ms-3 sm:ms-4 min-w-0 flex-1">
                        <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{bot.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {bot.document_count || 0} {t('chatbots.card.documents')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 line-clamp-2">
                    {bot.welcome_message || 'Hello! How can I help you today?'}
                  </p>

                  <div className="mt-3 sm:mt-4 flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-500">
                      {bot.total_messages || 0} {t('chatbots.card.messages')}
                    </span>
                    {/* Public Toggle */}
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => handleTogglePublic(bot)}
                      title={bot.is_public ? 'Click to make private' : 'Click to make public'}
                    >
                      <span className={`text-xs font-medium ${bot.is_public ? 'text-green-600' : 'text-gray-500'}`}>
                        {bot.is_public ? (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {t('chatbots.public', 'Public')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            {t('chatbots.private', 'Private')}
                          </span>
                        )}
                      </span>
                      <Switch
                        checked={bot.is_public || false}
                        onCheckedChange={() => handleTogglePublic(bot)}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 min-h-[56px]">
                  <div className="flex gap-2 flex-1">
                    <Link
                      to={`/chatbots/${bot.id}`}
                      className="flex items-center justify-center text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm min-h-[44px] flex-1 sm:flex-none"
                    >
                      <Settings className="w-4 h-4 me-1 flex-shrink-0" />
                      <span className="truncate">{t('chatbots.configure')}</span>
                    </Link>
                    <a
                      href={`/chat/${bot.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium text-xs sm:text-sm min-h-[44px] transition-colors flex-1 sm:flex-none"
                      title="Preview shared chatbot link"
                    >
                      <Eye className="w-4 h-4 me-1 flex-shrink-0" />
                      <span className="truncate">{t('chatbots.preview', 'Preview')}</span>
                    </a>
                  </div>
                  <button
                    onClick={() => handleDelete(bot.id, bot.name)}
                    className="flex items-center justify-center text-red-500 hover:text-red-600 text-xs sm:text-sm min-h-[44px]"
                  >
                    <Trash2 className="w-4 h-4 me-1 flex-shrink-0" />
                    <span className="truncate">{t('chatbots.delete')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ChatbotList;
