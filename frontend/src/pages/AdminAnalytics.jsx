import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { admin } from '../utils/api';
import {
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  Globe,
  Target,
  Activity,
  Clock,
  RefreshCw,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  MapPin,
  Megaphone,
  MessageSquare,
  FileText,
  Bot,
  Zap,
} from 'lucide-react';

const AdminAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [businessData, setBusinessData] = useState(null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [businessRes, realtimeRes] = await Promise.all([
        admin.getBusinessAnalytics(),
        admin.getRealtimeAnalytics(),
      ]);
      setBusinessData(businessRes.data);
      setRealtimeData(realtimeRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const BarChartSimple = ({ data, labelKey = 'label', valueKey = 'count', color = 'blue' }) => {
    if (!data || data.length === 0) {
      return <p className="text-gray-500 text-sm text-center py-4">No data available</p>;
    }
    const maxValue = Math.max(...data.map(d => d[valueKey]));

    return (
      <div className="space-y-2">
        {data.slice(0, 8).map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-24 truncate" title={item[labelKey]}>
              {item[labelKey]}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full bg-${color}-500 rounded-full transition-all duration-500`}
                style={{ width: `${(item[valueKey] / maxValue) * 100}%`, backgroundColor: color === 'blue' ? '#3B82F6' : color === 'purple' ? '#8B5CF6' : color === 'green' ? '#10B981' : color === 'orange' ? '#F59E0B' : '#3B82F6' }}
              />
            </div>
            <span className="text-xs font-medium text-gray-900 w-8 text-right">{item[valueKey]}</span>
          </div>
        ))}
      </div>
    );
  };

  const FunnelChart = ({ funnel }) => {
    const steps = [
      { label: 'Total Users', value: funnel.total_users, color: '#3B82F6' },
      { label: 'Created Chatbot', value: funnel.users_with_chatbots, color: '#8B5CF6' },
      { label: 'Uploaded Docs', value: funnel.users_with_documents, color: '#10B981' },
    ];
    const maxValue = steps[0].value || 1;

    return (
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={idx}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{step.label}</span>
              <span className="font-medium">{step.value}</span>
            </div>
            <div className="bg-gray-100 rounded h-8 overflow-hidden">
              <div
                className="h-full rounded transition-all duration-700 flex items-center justify-end pr-2"
                style={{
                  width: `${(step.value / maxValue) * 100}%`,
                  backgroundColor: step.color
                }}
              >
                <span className="text-white text-xs font-medium">
                  {((step.value / maxValue) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const MiniChart = ({ data, height = 40 }) => {
    if (!data || data.length === 0) return null;
    const maxValue = Math.max(...data.map(d => d.messages || d.new_users || 0)) || 1;
    const width = 100 / data.length;

    return (
      <div className="flex items-end gap-0.5" style={{ height }}>
        {data.map((item, idx) => (
          <div
            key={idx}
            className="bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
            style={{
              width: `${width}%`,
              height: `${((item.messages || item.new_users || 0) / maxValue) * 100}%`,
              minHeight: '2px'
            }}
            title={`${item.hour || item.week}: ${item.messages || item.new_users || 0}`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-blue-600" />
              Business Analytics
            </h1>
            <p className="text-gray-500 mt-1">Comprehensive insights for business decisions</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Real-time Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Active Now</p>
                <p className="text-3xl font-bold">{realtimeData?.active_now || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-green-200" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Last 24h Users</p>
                <p className="text-2xl font-bold text-gray-900">{realtimeData?.last_24h?.new_users || 0}</p>
              </div>
              <Users className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Last 24h Messages</p>
                <p className="text-2xl font-bold text-gray-900">{realtimeData?.last_24h?.messages || 0}</p>
              </div>
              <MessageSquare className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Last Hour Messages</p>
                <p className="text-2xl font-bold text-gray-900">{realtimeData?.last_hour?.messages || 0}</p>
              </div>
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Hourly Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-400" />
            24-Hour Activity
          </h2>
          <MiniChart data={realtimeData?.hourly_breakdown || []} height={60} />
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>24h ago</span>
            <span>Now</span>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Weekly Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{businessData?.engagement?.weekly_active_users || 0}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Users who sent messages in the last 7 days</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Chatbots/User</p>
                <p className="text-2xl font-bold text-gray-900">{businessData?.engagement?.avg_chatbots_per_user || 0}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Average chatbots created per user</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Msgs/Conversation</p>
                <p className="text-2xl font-bold text-gray-900">{businessData?.engagement?.avg_msgs_per_conversation || 0}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Average messages per conversation</p>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-gray-400" />
            Conversion Funnel
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FunnelChart funnel={businessData?.funnel || {}} />
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Signup → Chatbot</p>
                <p className="text-2xl font-bold text-blue-900">
                  {businessData?.funnel?.conversion_to_chatbot || 0}%
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Signup → Document Upload</p>
                <p className="text-2xl font-bold text-green-900">
                  {businessData?.funnel?.conversion_to_document || 0}%
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600">Public Chatbots</p>
                <p className="text-2xl font-bold text-purple-900">
                  {businessData?.funnel?.public_chatbots || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Demographics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Company Size */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              By Company Size
            </h3>
            <BarChartSimple
              data={businessData?.demographics?.by_company_size || []}
              color="blue"
            />
          </div>

          {/* Industry */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gray-400" />
              By Industry
            </h3>
            <BarChartSimple
              data={businessData?.demographics?.by_industry || []}
              color="purple"
            />
          </div>

          {/* Use Case */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-gray-400" />
              By Use Case
            </h3>
            <BarChartSimple
              data={businessData?.demographics?.by_use_case || []}
              color="green"
            />
          </div>

          {/* Country */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              By Country
            </h3>
            <BarChartSimple
              data={businessData?.demographics?.by_country || []}
              color="orange"
            />
          </div>

          {/* Referral Source */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-gray-400" />
              Referral Source
            </h3>
            <BarChartSimple
              data={businessData?.demographics?.by_referral || []}
              color="blue"
            />
          </div>

          {/* Weekly Growth */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              Weekly Signups (12 weeks)
            </h3>
            <MiniChart data={businessData?.growth?.weekly_signups || []} height={80} />
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Chatbots */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Top Chatbots by Messages
            </h3>
            <div className="space-y-3">
              {(businessData?.top_performers?.chatbots || []).slice(0, 5).map((bot, idx) => (
                <div key={bot.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{bot.name}</p>
                  </div>
                  <span className="text-sm text-gray-500">{bot.message_count} msgs</span>
                </div>
              ))}
              {(!businessData?.top_performers?.chatbots || businessData.top_performers.chatbots.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">No data yet</p>
              )}
            </div>
          </div>

          {/* Top Users */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Top Users by Activity
            </h3>
            <div className="space-y-3">
              {(businessData?.top_performers?.users || []).slice(0, 5).map((u, idx) => (
                <div key={u.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.email}</p>
                    <p className="text-xs text-gray-500 truncate">{u.company || 'N/A'}</p>
                  </div>
                  <span className="text-sm text-gray-500">{u.message_count} msgs</span>
                </div>
              ))}
              {(!businessData?.top_performers?.users || businessData.top_performers.users.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">No data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Signups */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            Recent Signups
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Industry</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Use Case</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Country</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Signed Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(businessData?.recent_signups || []).map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-sm text-gray-900">{u.email}</td>
                    <td className="py-2 px-3 text-sm text-gray-600">{u.company_name || '-'}</td>
                    <td className="py-2 px-3 text-sm text-gray-600">{u.company_size || '-'}</td>
                    <td className="py-2 px-3 text-sm text-gray-600">{u.industry || '-'}</td>
                    <td className="py-2 px-3 text-sm text-gray-600">{u.use_case || '-'}</td>
                    <td className="py-2 px-3 text-sm text-gray-600">{u.country || '-'}</td>
                    <td className="py-2 px-3 text-sm text-gray-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminAnalytics;
