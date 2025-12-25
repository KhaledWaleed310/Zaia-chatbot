import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { chatbots } from '../utils/api';
import { BarChart3, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const Analytics = () => {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const { isRtl } = useLanguage();
  const location = useLocation();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await chatbots.list();
      setBots(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [location.key]); // Reload whenever route changes

  const totalMessages = bots.reduce((sum, bot) => sum + (bot.total_messages || 0), 0);
  const totalDocuments = bots.reduce((sum, bot) => sum + (bot.document_count || 0), 0);

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>
          <p className="text-gray-500 mt-1">{t('analytics.subtitle')}</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ms-4">
                <p className="text-sm text-gray-500">{t('analytics.stats.totalChatbots')}</p>
                <p className="text-2xl font-bold text-gray-900">{bots.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ms-4">
                <p className="text-sm text-gray-500">{t('analytics.stats.totalMessages')}</p>
                <p className="text-2xl font-bold text-gray-900">{totalMessages}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ms-4">
                <p className="text-sm text-gray-500">{t('analytics.stats.documents')}</p>
                <p className="text-2xl font-bold text-gray-900">{totalDocuments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ms-4">
                <p className="text-sm text-gray-500">{t('analytics.stats.avgPerBot')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {bots.length ? Math.round(totalMessages / bots.length) : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Per Bot Stats */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">{t('analytics.table.title')}</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">{tc('messages.loading')}</div>
          ) : bots.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{t('analytics.empty')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                      {t('analytics.table.chatbot')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                      {t('analytics.table.documents')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                      {t('analytics.table.messages')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                      {t('analytics.table.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bots.map((bot) => (
                    <tr key={bot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: bot.primary_color || '#3B82F6' }}
                          >
                            <MessageSquare className="w-5 h-5 text-white" />
                          </div>
                          <span className="ms-4 font-medium text-gray-900">{bot.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{bot.document_count || 0}</td>
                      <td className="px-6 py-4 text-gray-600">{bot.total_messages || 0}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {t('analytics.status.active')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
