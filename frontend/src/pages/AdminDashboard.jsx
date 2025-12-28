import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { admin } from '../utils/api';
import {
  Users,
  MessageSquare,
  FileText,
  Activity,
  TrendingUp,
  Database,
  Settings,
  Shield,
  AlertCircle,
  Loader2,
  ChevronRight,
  BarChart3,
  DollarSign,
  Server,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Gauge,
  PieChart,
  Brain,
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [usage, setUsage] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [serverStatus, setServerStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [statsRes, usageRes, dbRes, serverRes] = await Promise.all([
        admin.getStats(),
        admin.getUsageAnalytics(7),
        admin.getDatabaseStats(),
        admin.getServerStatus().catch(() => null),
      ]);
      setStats(statsRes.data);
      setUsage(usageRes.data.usage || []);
      setDatabases(dbRes.data.databases || []);
      setServerStatus(serverRes?.data || null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load admin data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
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

  // Calculate growth from usage data
  const todayData = usage[usage.length - 1] || {};
  const yesterdayData = usage[usage.length - 2] || {};
  const messageGrowth = yesterdayData.messages_sent
    ? ((todayData.messages_sent - yesterdayData.messages_sent) / yesterdayData.messages_sent * 100).toFixed(0)
    : 0;

  // Database health
  const healthyDbs = databases.filter(db => db.status === 'connected').length;
  const totalDbs = databases.length;

  // Server health score
  const serverHealth = serverStatus?.health?.overall_score || null;

  const adminModules = [
    {
      title: 'Business Analytics',
      description: 'User demographics, growth trends & engagement',
      icon: TrendingUp,
      path: '/admin/analytics',
      color: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Finance Analysis',
      description: 'API costs, pricing tiers & revenue optimization',
      icon: DollarSign,
      path: '/admin/finance',
      color: 'from-green-500 to-green-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      title: 'AIDEN Learning',
      description: 'Neural network visualization of platform learning',
      icon: Brain,
      path: '/admin/learning',
      color: 'from-indigo-500 to-purple-600',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Server Monitor',
      description: 'Capacity, resources & scaling recommendations',
      icon: Server,
      path: '/admin/server',
      color: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      badge: serverHealth ? (serverHealth >= 70 ? 'Healthy' : serverHealth >= 40 ? 'Warning' : 'Critical') : null,
      badgeColor: serverHealth ? (serverHealth >= 70 ? 'bg-green-100 text-green-700' : serverHealth >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700') : null,
    },
    {
      title: 'User Management',
      description: 'View, edit & manage user accounts',
      icon: Users,
      path: '/admin/users',
      color: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      stat: stats?.total_users || 0,
      statLabel: 'users',
    },
    {
      title: 'Chatbot Management',
      description: 'Monitor & manage all chatbots',
      icon: MessageSquare,
      path: '/admin/chatbots',
      color: 'from-pink-500 to-pink-600',
      iconBg: 'bg-pink-100',
      iconColor: 'text-pink-600',
      stat: stats?.total_chatbots || 0,
      statLabel: 'bots',
    },
    {
      title: 'Database Status',
      description: 'Monitor connections & storage',
      icon: Database,
      path: '/admin/databases',
      color: 'from-cyan-500 to-cyan-600',
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      badge: `${healthyDbs}/${totalDbs} Online`,
      badgeColor: healthyDbs === totalDbs ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700',
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: Settings,
      path: '/admin/settings',
      color: 'from-gray-500 to-gray-600',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-500">Welcome back, manage your platform</p>
              </div>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{(stats?.total_users || 0).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm">
              <span className="text-green-600 font-medium flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
                {todayData.new_users || 0}
              </span>
              <span className="text-gray-400">new today</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Chatbots</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{(stats?.total_chatbots || 0).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm">
              <span className="text-green-600 font-medium flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
                {todayData.new_chatbots || 0}
              </span>
              <span className="text-gray-400">new today</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Messages</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{(stats?.total_messages || 0).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm">
              {parseInt(messageGrowth) >= 0 ? (
                <span className="text-green-600 font-medium flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  {messageGrowth}%
                </span>
              ) : (
                <span className="text-red-600 font-medium flex items-center gap-0.5">
                  <ArrowDownRight className="w-3 h-3" />
                  {Math.abs(messageGrowth)}%
                </span>
              )}
              <span className="text-gray-400">vs yesterday</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Documents</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{(stats?.total_documents || 0).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm">
              <span className="text-green-600 font-medium flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
                {todayData.new_documents || 0}
              </span>
              <span className="text-gray-400">new today</span>
            </div>
          </div>
        </div>

        {/* Status Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Server Health */}
          {serverHealth !== null && (
            <div className={`rounded-xl p-5 border-2 ${
              serverHealth >= 70 ? 'bg-green-50 border-green-200' :
              serverHealth >= 40 ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    serverHealth >= 70 ? 'bg-green-100' :
                    serverHealth >= 40 ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <Gauge className={`w-5 h-5 ${
                      serverHealth >= 70 ? 'text-green-600' :
                      serverHealth >= 40 ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Server Health</p>
                    <p className={`text-lg font-bold ${
                      serverHealth >= 70 ? 'text-green-700' :
                      serverHealth >= 40 ? 'text-yellow-700' : 'text-red-700'
                    }`}>
                      {serverHealth >= 70 ? 'Excellent' : serverHealth >= 40 ? 'Warning' : 'Critical'}
                    </p>
                  </div>
                </div>
                <div className={`text-3xl font-bold ${
                  serverHealth >= 70 ? 'text-green-600' :
                  serverHealth >= 40 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {serverHealth}
                </div>
              </div>
            </div>
          )}

          {/* Database Status */}
          <div className={`rounded-xl p-5 border-2 ${
            healthyDbs === totalDbs ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  healthyDbs === totalDbs ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  <Database className={`w-5 h-5 ${
                    healthyDbs === totalDbs ? 'text-green-600' : 'text-yellow-600'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Database Status</p>
                  <p className={`text-lg font-bold ${
                    healthyDbs === totalDbs ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {healthyDbs === totalDbs ? 'All Connected' : 'Partial'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {databases.map((db, idx) => (
                  <div
                    key={idx}
                    className={`w-3 h-3 rounded-full ${
                      db.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    title={db.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Subscription Breakdown */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <PieChart className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Subscription Tiers</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Free</span>
                  <span className="font-medium text-gray-700">{stats?.users_by_tier?.free || 0}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-400 rounded-full"
                    style={{ width: `${((stats?.users_by_tier?.free || 0) / (stats?.total_users || 1)) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Pro</span>
                  <span className="font-medium text-blue-600">{stats?.users_by_tier?.pro || 0}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${((stats?.users_by_tier?.pro || 0) / (stats?.total_users || 1)) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Enterprise</span>
                  <span className="font-medium text-purple-600">{stats?.users_by_tier?.enterprise || 0}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${((stats?.users_by_tier?.enterprise || 0) / (stats?.total_users || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Modules Grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {adminModules.map((module, index) => {
              const Icon = module.icon;
              return (
                <Link
                  key={index}
                  to={module.path}
                  className="group bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${module.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${module.iconColor}`} />
                    </div>
                    {module.badge && (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${module.badgeColor}`}>
                        {module.badge}
                      </span>
                    )}
                    {module.stat !== undefined && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                        {module.stat} {module.statLabel}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">{module.description}</p>
                  <div className="flex items-center text-purple-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Open
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">7-Day Activity</h2>
            </div>
            <Link
              to="/admin/analytics"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              View Analytics
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {usage.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">New Users</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Chatbots</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Documents</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Messages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usage.slice(-7).reverse().map((day, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-gray-900">{day.date}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-medium ${
                          day.new_users > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {day.new_users > 0 ? `+${day.new_users}` : '0'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-medium ${
                          day.new_chatbots > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {day.new_chatbots > 0 ? `+${day.new_chatbots}` : '0'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-medium ${
                          day.new_documents > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {day.new_documents > 0 ? `+${day.new_documents}` : '0'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm font-medium text-gray-700">
                          {day.messages_sent?.toLocaleString() || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No activity data available yet</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
