import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { marketing } from '../utils/api';
import PixelConfigModal from '../components/marketing/PixelConfigModal';
import {
  Megaphone,
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  MousePointer,
  Eye,
  RefreshCw,
  Loader2,
  AlertCircle,
  Settings,
  BarChart3,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  UserPlus,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
} from 'lucide-react';

const AdminMarketing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPixelModal, setShowPixelModal] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    // Check access - allow marketing or admin roles
    const userRole = user?.role || 'user';
    const hasAccess = userRole === 'marketing' || userRole === 'admin' || user?.is_admin;

    if (user && !hasAccess) {
      navigate('/dashboard');
      return;
    }
    setLoading(true);
    loadData();
  }, [user, navigate, days, location.key]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [dashboardRes, conversionsRes] = await Promise.all([
        marketing.getDashboard(days),
        marketing.getConversions(days),
      ]);
      setDashboardData({
        ...dashboardRes.data,
        conversions: conversionsRes.data,
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load marketing data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() || '0';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const StatCard = ({ icon: Icon, label, value, subValue, trend, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{Math.abs(trend).toFixed(1)}% vs last period</span>
        </div>
      )}
    </div>
  );

  const TrendChart = ({ data }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-20 flex items-center justify-center">
          <p className="text-sm text-gray-400">No trend data available</p>
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => d.conversions || d.clicks || 0), 1);

    return (
      <div className="flex items-end gap-1 h-20">
        {data.slice(-14).map((day, idx) => {
          const value = day.conversions || day.clicks || 0;
          return (
            <div
              key={idx}
              className="flex-1 bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              style={{ height: `${(value / maxValue) * 100}%`, minHeight: value > 0 ? '4px' : '2px' }}
              title={`${day.date}: ${value} ${day.conversions !== undefined ? 'conversions' : 'clicks'}`}
            />
          );
        })}
      </div>
    );
  };

  const WebsiteFunnel = ({ byType }) => {
    const landingViews = byType?.landing_view || 0;
    const signupStarted = byType?.signup_started || 0;
    const signupCompleted = byType?.signup_completed || 0;
    const chatOpened = byType?.chat_opened || 0;

    const maxValue = Math.max(landingViews, 1);

    const FunnelStep = ({ label, value, color, percentage }) => (
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">{label}</span>
          <span className="font-medium">{formatNumber(value)} {percentage && <span className="text-gray-400 text-xs">({percentage}%)</span>}</span>
        </div>
        <div
          className={`h-8 ${color} rounded transition-all`}
          style={{ width: `${Math.max((value / maxValue) * 100, value > 0 ? 5 : 2)}%` }}
        />
      </div>
    );

    return (
      <div className="space-y-3">
        <FunnelStep label="Landing Page Views" value={landingViews} color="bg-blue-500" />
        <FunnelStep
          label="Signup Started"
          value={signupStarted}
          color="bg-purple-500"
          percentage={landingViews > 0 ? ((signupStarted / landingViews) * 100).toFixed(1) : 0}
        />
        <FunnelStep
          label="Signup Completed"
          value={signupCompleted}
          color="bg-green-500"
          percentage={signupStarted > 0 ? ((signupCompleted / signupStarted) * 100).toFixed(1) : 0}
        />
        <FunnelStep
          label="Chat Opened"
          value={chatOpened}
          color="bg-orange-500"
          percentage={landingViews > 0 ? ((chatOpened / landingViews) * 100).toFixed(1) : 0}
        />
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

  const { summary, campaigns, audience_insights, daily_trend, top_performing_campaigns, pixel_config, conversions } = dashboardData || {};

  // Get event counts from conversions data
  const byType = conversions?.by_type || {};
  const bySource = conversions?.by_source || {};
  const totalEvents = conversions?.total_conversions || 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-7 h-7 text-purple-600" />
              Marketing Dashboard
            </h1>
            <p className="text-gray-500 mt-1">Track campaigns, pixels, and conversions</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={() => setShowPixelModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Pixel Settings
            </button>
            <button
              onClick={loadData}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Pixel Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${pixel_config?.facebook_pixel_id ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600">Facebook Pixel</span>
                {pixel_config?.facebook_pixel_id && (
                  <span className="text-xs text-gray-400">({pixel_config.facebook_pixel_id})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${pixel_config?.google_analytics_id ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600">Google Analytics</span>
                {pixel_config?.google_analytics_id && (
                  <span className="text-xs text-gray-400">({pixel_config.google_analytics_id})</span>
                )}
              </div>
            </div>
            {(!pixel_config?.facebook_pixel_id && !pixel_config?.google_analytics_id) && (
              <button
                onClick={() => setShowPixelModal(true)}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                Configure pixels <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={Eye}
            label="Landing Page Views"
            value={formatNumber(byType.landing_view || 0)}
            color="bg-blue-500"
          />
          <StatCard
            icon={UserPlus}
            label="Signup Started"
            value={formatNumber(byType.signup_started || 0)}
            subValue={(byType.landing_view || 0) > 0 ? `${(((byType.signup_started || 0) / byType.landing_view) * 100).toFixed(1)}% of visitors` : '0% of visitors'}
            color="bg-yellow-500"
          />
          <StatCard
            icon={Target}
            label="Signup Completed"
            value={formatNumber(byType.signup_completed || 0)}
            subValue={(byType.signup_started || 0) > 0 ? `${(((byType.signup_completed || 0) / byType.signup_started) * 100).toFixed(1)}% completion` : '0% completion'}
            color="bg-green-500"
          />
          <StatCard
            icon={MessageSquare}
            label="Chats Opened"
            value={formatNumber(byType.chat_opened || 0)}
            subValue={(byType.landing_view || 0) > 0 ? `${(((byType.chat_opened || 0) / byType.landing_view) * 100).toFixed(1)}% engagement` : '0% engagement'}
            color="bg-purple-500"
          />
          <StatCard
            icon={MousePointer}
            label="CTA Clicks"
            value={formatNumber(byType.cta_clicked || 0)}
            subValue="Button clicks tracked"
            color="bg-orange-500"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Website Funnel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Website Conversion Funnel
            </h3>
            <WebsiteFunnel byType={byType} />
          </div>

          {/* Traffic Sources */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Traffic Sources
            </h3>
            {Object.keys(bySource).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(bySource)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([source, count]) => {
                    const percentage = totalEvents > 0 ? (count / totalEvents) * 100 : 0;
                    return (
                      <div key={source} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-24 truncate" title={source}>
                          {source === 'direct' ? 'Direct' : source}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4">
                          <div
                            className="bg-blue-500 h-4 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-16 text-right">
                          {count} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center">
                <p className="text-sm text-gray-400">No traffic data available yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Event Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Daily Events (Last 14 days)
          </h3>
          <TrendChart data={conversions?.trend || daily_trend} />
          {(conversions?.trend?.length > 0 || daily_trend?.length > 0) && (
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>{(conversions?.trend || daily_trend)?.[Math.max(0, (conversions?.trend || daily_trend).length - 14)]?.date || ''}</span>
              <span>{(conversions?.trend || daily_trend)?.[(conversions?.trend || daily_trend).length - 1]?.date || ''}</span>
            </div>
          )}
        </div>

        {/* Event Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Event Breakdown</h3>
          </div>
          {Object.keys(byType).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(byType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([eventType, count]) => {
                      const percentage = totalEvents > 0 ? (count / totalEvents) * 100 : 0;
                      const eventLabels = {
                        landing_view: 'Landing Page View',
                        signup_started: 'Signup Started',
                        signup_completed: 'Signup Completed',
                        login: 'Login',
                        chat_opened: 'Chat Opened',
                        chat_message_sent: 'Chat Message Sent',
                        cta_clicked: 'CTA Clicked',
                        demo_request: 'Demo Request',
                      };
                      return (
                        <tr key={eventType} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <span className="font-medium text-gray-900">{eventLabels[eventType] || eventType}</span>
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600">{formatNumber(count)}</td>
                          <td className="px-6 py-4 text-right text-gray-600">{percentage.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No events tracked yet</p>
              <p className="text-sm text-gray-400 mt-1">Events will appear here as visitors interact with your website</p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Quick Stats
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Signup Conversion Rate */}
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Signup Conversion Rate</p>
              <p className="text-3xl font-bold text-green-600">
                {(byType.landing_view || 0) > 0 ? (((byType.signup_completed || 0) / byType.landing_view) * 100).toFixed(1) : '0.0'}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Visitors → Signups</p>
            </div>

            {/* Signup Completion Rate */}
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Signup Completion Rate</p>
              <p className="text-3xl font-bold text-purple-600">
                {(byType.signup_started || 0) > 0 ? (((byType.signup_completed || 0) / byType.signup_started) * 100).toFixed(1) : '0.0'}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Started → Completed</p>
            </div>

            {/* Chat Engagement Rate */}
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Chat Engagement Rate</p>
              <p className="text-3xl font-bold text-blue-600">
                {(byType.landing_view || 0) > 0 ? (((byType.chat_opened || 0) / byType.landing_view) * 100).toFixed(1) : '0.0'}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Visitors → Chats</p>
            </div>
          </div>
        </div>

        {/* Setup Guide - only show if no pixels configured */}
        {(!pixel_config?.facebook_pixel_id && !pixel_config?.google_analytics_id) && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Get Started with Tracking</p>
                <p className="text-sm text-blue-600 mt-1">
                  Configure your Facebook Pixel and Google Analytics codes in Pixel Settings to start tracking campaign performance and conversions.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pixel Config Modal */}
      {showPixelModal && (
        <PixelConfigModal
          config={pixel_config}
          onClose={() => setShowPixelModal(false)}
          onSave={() => {
            setShowPixelModal(false);
            loadData();
          }}
        />
      )}
    </Layout>
  );
};

export default AdminMarketing;
