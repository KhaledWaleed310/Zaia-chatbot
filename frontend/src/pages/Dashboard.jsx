import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { chatbots } from '../utils/api';
import { MessageSquare, FileText, Users, Plus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const Dashboard = () => {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const { isRtl } = useLanguage();
  const location = useLocation();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBots: 0,
    totalDocuments: 0,
    totalMessages: 0,
  });

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await chatbots.list();
      setBots(response.data);

      const totalDocs = response.data.reduce((sum, bot) => sum + (bot.document_count || 0), 0);
      const totalMsgs = response.data.reduce((sum, bot) => sum + (bot.total_messages || 0), 0);

      setStats({
        totalBots: response.data.length,
        totalDocuments: totalDocs,
        totalMessages: totalMsgs,
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [location.key]); // Reload whenever route changes (including navigation back to dashboard)

  const statCards = [
    { label: t('dashboard.stats.totalChatbots'), value: stats.totalBots, icon: MessageSquare, color: 'bg-blue-500' },
    { label: t('dashboard.stats.documents'), value: stats.totalDocuments, icon: FileText, color: 'bg-green-500' },
    { label: t('dashboard.stats.totalMessages'), value: stats.totalMessages, icon: Users, color: 'bg-purple-500' },
  ];

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">{t('dashboard.welcome')}</p>
          </div>
          <Link
            to="/chatbots/new"
            className="flex items-center justify-center px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] text-sm sm:text-base"
          >
            <Plus className="w-5 h-5 me-2" />
            {t('chatbots.newChatbot')}
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center">
                  <div className={`${stat.color} p-2 sm:p-3 rounded-lg flex-shrink-0`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="ms-3 sm:ms-4 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{stat.label}</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Chatbots */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('chatbots.title')}</h2>
          </div>

          {loading ? (
            <div className="p-6 sm:p-8 text-center text-sm sm:text-base text-gray-500">{tc('messages.loading')}</div>
          ) : bots.length === 0 ? (
            <div className="p-6 sm:p-8 text-center">
              <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">{t('dashboard.noChatbots.title')}</h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4">{t('dashboard.noChatbots.description')}</p>
              <Link
                to="/chatbots/new"
                className="inline-flex items-center justify-center px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px] text-sm sm:text-base"
              >
                <Plus className="w-5 h-5 me-2" />
                {t('dashboard.noChatbots.cta')}
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {bots.slice(0, 5).map((bot) => (
                <Link
                  key={bot.id}
                  to={`/chatbots/${bot.id}`}
                  className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-gray-50 min-h-[60px] sm:min-h-[68px]"
                >
                  <div className="flex items-center min-w-0 flex-1 pe-4">
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: bot.primary_color || '#3B82F6' }}
                    >
                      <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="ms-3 sm:ms-4 min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{bot.name}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        {bot.document_count || 0} docs • {bot.total_messages || 0} msgs
                      </p>
                    </div>
                  </div>
                  <span className={`text-gray-400 text-lg sm:text-xl flex-shrink-0 ${isRtl ? 'rotate-180' : ''}`}>→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
