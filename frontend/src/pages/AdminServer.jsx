import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { admin } from '../utils/api';
import {
  Server,
  Cpu,
  HardDrive,
  Database,
  Users,
  MessageSquare,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  TrendingUp,
  ArrowUpCircle,
  Gauge
} from 'lucide-react';

const AdminServer = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const response = await admin.getServerStatus();
      setData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load server status');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (health) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (health) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <CheckCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'none': return 'bg-green-500';
      case 'low': return 'bg-blue-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getProgressColor = (percent, inverse = false) => {
    const value = inverse ? 100 - percent : percent;
    if (value >= 85) return 'bg-red-500';
    if (value >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
          <button onClick={fetchData} className="ml-4 underline">Retry</button>
        </div>
      </Layout>
    );
  }

  const { system, application, health, capacity, upgrade, scaling_tiers } = data;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Server Monitor</h1>
            <p className="text-gray-500 mt-1">Capacity utilization and upgrade recommendations</p>
          </div>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Overall Health Score */}
        <div className={`rounded-xl p-6 ${
          health.overall_score >= 70 ? 'bg-green-50 border-2 border-green-200' :
          health.overall_score >= 40 ? 'bg-yellow-50 border-2 border-yellow-200' :
          'bg-red-50 border-2 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                health.overall_score >= 70 ? 'bg-green-100' :
                health.overall_score >= 40 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <Gauge className={`w-8 h-8 ${
                  health.overall_score >= 70 ? 'text-green-600' :
                  health.overall_score >= 40 ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Server Health Score</h2>
                <p className="text-gray-600">{upgrade.overall_recommendation}</p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-5xl font-bold ${
                health.overall_score >= 70 ? 'text-green-600' :
                health.overall_score >= 40 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {health.overall_score}
              </div>
              <div className="text-sm text-gray-500">out of 100</div>
            </div>
          </div>
        </div>

        {/* Resource Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CPU */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getHealthColor(system.cpu.health)}`}>
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">CPU</h3>
                  <p className="text-sm text-gray-500">{system.cpu.cores} cores</p>
                </div>
              </div>
              {getHealthIcon(system.cpu.health)}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Usage</span>
                <span className="font-medium">{system.cpu.usage_percent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${getProgressColor(system.cpu.usage_percent)}`}
                  style={{ width: `${system.cpu.usage_percent}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {system.cpu.frequency_mhz ? `${system.cpu.frequency_mhz} MHz` : 'Frequency N/A'}
              </p>
            </div>
          </div>

          {/* Memory */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getHealthColor(system.memory.health)}`}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Memory</h3>
                  <p className="text-sm text-gray-500">{system.memory.total_gb} GB total</p>
                </div>
              </div>
              {getHealthIcon(system.memory.health)}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Used</span>
                <span className="font-medium">{system.memory.used_gb} GB ({system.memory.usage_percent}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${getProgressColor(system.memory.usage_percent)}`}
                  style={{ width: `${system.memory.usage_percent}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {system.memory.available_gb} GB available
              </p>
            </div>
          </div>

          {/* Disk */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getHealthColor(system.disk.health)}`}>
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Disk</h3>
                  <p className="text-sm text-gray-500">{system.disk.total_gb} GB total</p>
                </div>
              </div>
              {getHealthIcon(system.disk.health)}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Used</span>
                <span className="font-medium">{system.disk.used_gb} GB ({system.disk.usage_percent}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${getProgressColor(system.disk.usage_percent)}`}
                  style={{ width: `${system.disk.usage_percent}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {system.disk.available_gb} GB available
              </p>
            </div>
          </div>
        </div>

        {/* Application Metrics */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Application Data
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{application.users}</p>
              <p className="text-xs text-gray-500">Users</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{application.chatbots}</p>
              <p className="text-xs text-gray-500">Chatbots</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{application.documents}</p>
              <p className="text-xs text-gray-500">Documents</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <MessageSquare className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{application.messages}</p>
              <p className="text-xs text-gray-500">Messages</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Database className="w-6 h-6 text-cyan-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{application.chunks}</p>
              <p className="text-xs text-gray-500">Chunks</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <HardDrive className="w-6 h-6 text-pink-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{application.database_size_mb}</p>
              <p className="text-xs text-gray-500">DB Size (MB)</p>
            </div>
          </div>
        </div>

        {/* Capacity & Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Capacity */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Growth Capacity
            </h3>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                capacity.growth_headroom === 'high' ? 'bg-green-50' :
                capacity.growth_headroom === 'medium' ? 'bg-yellow-50' : 'bg-red-50'
              }`}>
                <p className="text-sm text-gray-600">Growth Headroom</p>
                <p className={`text-2xl font-bold ${
                  capacity.growth_headroom === 'high' ? 'text-green-600' :
                  capacity.growth_headroom === 'medium' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {capacity.growth_headroom.charAt(0).toUpperCase() + capacity.growth_headroom.slice(1)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Can Add More Users</p>
                  <p className="text-xl font-bold text-gray-900">~{capacity.estimated_users_remaining.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Can Handle Messages</p>
                  <p className="text-xl font-bold text-gray-900">~{(capacity.estimated_messages_remaining / 1000000).toFixed(1)}M</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade Status */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-purple-600" />
              Upgrade Status
            </h3>
            <div className={`p-4 rounded-lg mb-4 ${
              !upgrade.needed ? 'bg-green-50 border border-green-200' :
              upgrade.urgency === 'critical' ? 'bg-red-50 border border-red-200' :
              upgrade.urgency === 'high' ? 'bg-orange-50 border border-orange-200' :
              'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getUrgencyColor(upgrade.urgency)}`} />
                <div>
                  <p className="font-medium text-gray-900">
                    {upgrade.needed ? 'Upgrade Recommended' : 'No Upgrade Needed'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Urgency: {upgrade.urgency.charAt(0).toUpperCase() + upgrade.urgency.slice(1)}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              {upgrade.overall_recommendation}
            </p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Component Recommendations</h3>
          <div className="space-y-3">
            {upgrade.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  rec.status === 'healthy' ? 'bg-green-50 border-green-500' :
                  rec.status === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {getHealthIcon(rec.status)}
                      <span className="font-medium text-gray-900">{rec.component}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{rec.message}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    rec.status === 'healthy' ? 'bg-green-200 text-green-800' :
                    rec.status === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-red-200 text-red-800'
                  }`}>
                    {rec.status}
                  </span>
                </div>
                {rec.action !== 'No action needed' && (
                  <p className="text-sm text-gray-500 mt-2 pl-7">
                    <strong>Action:</strong> {rec.action}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scaling Tiers */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-600" />
            Scaling Options
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {scaling_tiers.map((tier, idx) => (
              <div
                key={idx}
                className={`rounded-xl p-5 border-2 ${
                  tier.status === 'active' ? 'border-blue-500 bg-blue-50' :
                  tier.status === 'recommended' ? 'border-green-500 bg-green-50' :
                  'border-gray-200 bg-gray-50'
                }`}
              >
                {tier.status === 'active' && (
                  <span className="text-xs font-bold text-blue-600 uppercase">Current</span>
                )}
                {tier.status === 'recommended' && (
                  <span className="text-xs font-bold text-green-600 uppercase">Recommended</span>
                )}
                <h4 className="text-lg font-bold text-gray-900 mt-1">{tier.name}</h4>
                <p className="text-sm text-gray-600 mt-2">{tier.specs}</p>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-2xl font-bold text-gray-900">
                    ${tier.monthly_cost}
                    <span className="text-sm font-normal text-gray-500">/mo</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Up to {tier.max_users.toLocaleString()} users
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Swap Info (if applicable) */}
        {system.swap.total_gb > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <strong>Swap:</strong> {system.swap.used_gb}GB / {system.swap.total_gb}GB ({system.swap.usage_percent}% used)
            {system.swap.usage_percent > 50 && (
              <span className="text-yellow-600 ml-2">- High swap usage indicates memory pressure</span>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminServer;
