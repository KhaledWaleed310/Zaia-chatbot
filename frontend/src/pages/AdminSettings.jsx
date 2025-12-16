import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { admin } from '../utils/api';
import {
  Settings,
  Save,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Mail,
  Shield,
  Database,
  MessageSquare,
  FileText,
  Globe,
  Key,
  Bell,
  Zap,
} from 'lucide-react';

const AdminSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    // General
    app_name: 'Aiden',
    app_description: 'AI-powered chatbot platform',
    support_email: 'info@zaiasystems.com',

    // Registration
    allow_registration: true,
    require_email_verification: false,
    default_subscription_tier: 'free',

    // Limits - Free tier
    free_max_chatbots: 1,
    free_max_documents: 5,
    free_max_messages_per_day: 50,
    free_max_file_size_mb: 5,

    // Limits - Pro tier
    pro_max_chatbots: 10,
    pro_max_documents: 50,
    pro_max_messages_per_day: 1000,
    pro_max_file_size_mb: 25,

    // Limits - Enterprise tier
    enterprise_max_chatbots: -1,
    enterprise_max_documents: -1,
    enterprise_max_messages_per_day: -1,
    enterprise_max_file_size_mb: 100,

    // AI Settings
    default_model: 'deepseek-chat',
    max_context_chunks: 10,
    temperature: 0.7,

    // Maintenance
    maintenance_mode: false,
    maintenance_message: 'We are currently performing maintenance. Please try again later.',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/dashboard');
      return;
    }
    loadSettings();
  }, [user, navigate]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await admin.getSettings();
      if (res.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      // Settings may not exist yet, use defaults
      console.log('Using default settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await admin.updateSettings(settings);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-7 h-7 text-orange-600" />
              System Settings
            </h1>
            <p className="text-gray-500 mt-1">Configure application settings and limits</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadSettings}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* General Settings */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-gray-400" />
            General Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application Name</label>
              <input
                type="text"
                value={settings.app_name}
                onChange={(e) => handleChange('app_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
              <input
                type="email"
                value={settings.support_email}
                onChange={(e) => handleChange('support_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={settings.app_description}
                onChange={(e) => handleChange('app_description', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Registration Settings */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-gray-400" />
            Registration & Access
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Allow New Registrations</p>
                <p className="text-sm text-gray-500">Enable or disable user sign-ups</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allow_registration}
                  onChange={(e) => handleChange('allow_registration', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Require Email Verification</p>
                <p className="text-sm text-gray-500">Users must verify email before access</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.require_email_verification}
                  onChange={(e) => handleChange('require_email_verification', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Subscription Tier</label>
              <select
                value={settings.default_subscription_tier}
                onChange={(e) => handleChange('default_subscription_tier', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subscription Limits */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-gray-400" />
            Subscription Limits
          </h2>
          <p className="text-sm text-gray-500 mb-4">Set -1 for unlimited</p>

          <div className="space-y-6">
            {/* Free Tier */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                Free Tier
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Chatbots</label>
                  <input
                    type="number"
                    value={settings.free_max_chatbots}
                    onChange={(e) => handleChange('free_max_chatbots', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Documents</label>
                  <input
                    type="number"
                    value={settings.free_max_documents}
                    onChange={(e) => handleChange('free_max_documents', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Messages/Day</label>
                  <input
                    type="number"
                    value={settings.free_max_messages_per_day}
                    onChange={(e) => handleChange('free_max_messages_per_day', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max File Size (MB)</label>
                  <input
                    type="number"
                    value={settings.free_max_file_size_mb}
                    onChange={(e) => handleChange('free_max_file_size_mb', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Pro Tier */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                Pro Tier
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Chatbots</label>
                  <input
                    type="number"
                    value={settings.pro_max_chatbots}
                    onChange={(e) => handleChange('pro_max_chatbots', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Documents</label>
                  <input
                    type="number"
                    value={settings.pro_max_documents}
                    onChange={(e) => handleChange('pro_max_documents', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Messages/Day</label>
                  <input
                    type="number"
                    value={settings.pro_max_messages_per_day}
                    onChange={(e) => handleChange('pro_max_messages_per_day', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max File Size (MB)</label>
                  <input
                    type="number"
                    value={settings.pro_max_file_size_mb}
                    onChange={(e) => handleChange('pro_max_file_size_mb', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Enterprise Tier */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                Enterprise Tier
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Chatbots</label>
                  <input
                    type="number"
                    value={settings.enterprise_max_chatbots}
                    onChange={(e) => handleChange('enterprise_max_chatbots', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Documents</label>
                  <input
                    type="number"
                    value={settings.enterprise_max_documents}
                    onChange={(e) => handleChange('enterprise_max_documents', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Messages/Day</label>
                  <input
                    type="number"
                    value={settings.enterprise_max_messages_per_day}
                    onChange={(e) => handleChange('enterprise_max_messages_per_day', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max File Size (MB)</label>
                  <input
                    type="number"
                    value={settings.enterprise_max_file_size_mb}
                    onChange={(e) => handleChange('enterprise_max_file_size_mb', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Settings */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-gray-400" />
            AI Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Model</label>
              <select
                value={settings.default_model}
                onChange={(e) => handleChange('default_model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="deepseek-chat">DeepSeek Chat</option>
                <option value="deepseek-coder">DeepSeek Coder</option>
                <option value="deepseek-reasoner">DeepSeek Reasoner</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Context Chunks</label>
              <input
                type="number"
                value={settings.max_context_chunks}
                onChange={(e) => handleChange('max_context_chunks', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={settings.temperature}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-gray-400" />
            Maintenance Mode
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div>
                <p className="font-medium text-gray-900">Enable Maintenance Mode</p>
                <p className="text-sm text-gray-500">Block all non-admin users from accessing the app</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenance_mode}
                  onChange={(e) => handleChange('maintenance_mode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Message</label>
              <textarea
                value={settings.maintenance_message}
                onChange={(e) => handleChange('maintenance_message', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminSettings;
