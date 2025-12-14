import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Building, Crown, Zap, Check, Lock, MessageSquare, FileText, Bot, Key, Copy, Eye, EyeOff, Trash2, Plus, Loader2 } from 'lucide-react';
import { apiKeys } from '../utils/api';

const Settings = () => {
  const { user, refreshUser } = useAuth();
  const [saved, setSaved] = useState(false);
  const [usage, setUsage] = useState({
    chatbots: 0,
    documents: 0,
    messages_today: 0
  });
  const [limits, setLimits] = useState({
    max_chatbots: 1,
    max_documents_per_chatbot: 5,
    max_messages_per_day: 50,
    max_file_size_mb: 5
  });

  // API Keys state
  const [keys, setKeys] = useState([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState(['read']);
  const [createdKey, setCreatedKey] = useState(null);
  const [visibleKeys, setVisibleKeys] = useState({});
  const [creating, setCreating] = useState(false);

  // Get the user's subscription tier
  const subscriptionTier = user?.subscription_tier || 'free';

  // Plan display info
  const planInfo = {
    free: { name: 'Free Plan', color: 'bg-gray-100 text-gray-800' },
    pro: { name: 'Pro Plan', color: 'bg-blue-100 text-blue-800' },
    enterprise: { name: 'Enterprise Plan', color: 'bg-purple-100 text-purple-800' }
  };

  useEffect(() => {
    // Refresh user data to get latest subscription info
    refreshUser();

    // Fetch user usage and limits
    const fetchUsageAndLimits = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/v1/users/me/usage', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsage({
            chatbots: data.usage?.chatbots || data.chatbots || 0,
            documents: data.usage?.documents || data.documents || 0,
            messages_today: data.usage?.messages_today || data.messages_today || 0
          });
          // Set limits if returned from API
          if (data.limits) {
            setLimits(data.limits);
          }
        }
      } catch (err) {
        console.error('Failed to fetch usage:', err);
      }
    };
    fetchUsageAndLimits();
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setKeysLoading(true);
      const res = await apiKeys.list();
      setKeys(res.data.items || []);
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    } finally {
      setKeysLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      setCreating(true);
      const res = await apiKeys.create({
        name: newKeyName,
        scopes: newKeyScopes
      });
      setCreatedKey(res.data);
      setNewKeyName('');
      setNewKeyScopes(['read']);
      fetchApiKeys();
    } catch (err) {
      console.error('Failed to create API key:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (keyId) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return;
    try {
      await apiKeys.delete(keyId);
      setKeys(keys.filter(k => k.id !== keyId));
    } catch (err) {
      console.error('Failed to delete API key:', err);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    try {
      await apiKeys.revoke(keyId);
      fetchApiKeys();
    } catch (err) {
      console.error('Failed to revoke API key:', err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const maskKey = (key) => {
    if (!key) return '';
    return key.substring(0, 8) + '...' + key.substring(key.length - 4);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getUsagePercentage = (current, max) => {
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account settings and subscription</p>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile</h2>

          <div className="space-y-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Building className="w-4 h-4 mr-2" />
                Company Name
              </label>
              <input
                type="text"
                defaultValue={user?.company_name || ''}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Current Plan & Usage */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Your Plan</h2>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${planInfo[subscriptionTier]?.color || 'bg-gray-100 text-gray-800'}`}>
              {planInfo[subscriptionTier]?.name || 'Free Plan'}
            </span>
          </div>

          {/* Usage Stats */}
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Chatbots
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {usage.chatbots} / {limits.max_chatbots === -1 ? '∞' : limits.max_chatbots}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${limits.max_chatbots === -1 ? 'bg-green-500' : getUsageColor(getUsagePercentage(usage.chatbots, limits.max_chatbots))}`}
                  style={{ width: limits.max_chatbots === -1 ? '20%' : `${getUsagePercentage(usage.chatbots, limits.max_chatbots)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documents (per chatbot)
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {usage.documents} / {limits.max_documents_per_chatbot === -1 ? '∞' : limits.max_documents_per_chatbot}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${limits.max_documents_per_chatbot === -1 ? 'bg-green-500' : getUsageColor(getUsagePercentage(usage.documents, limits.max_documents_per_chatbot))}`}
                  style={{ width: limits.max_documents_per_chatbot === -1 ? '20%' : `${getUsagePercentage(usage.documents, limits.max_documents_per_chatbot)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Messages Today
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {usage.messages_today} / {limits.max_messages_per_day === -1 ? '∞' : limits.max_messages_per_day}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${limits.max_messages_per_day === -1 ? 'bg-green-500' : getUsageColor(getUsagePercentage(usage.messages_today, limits.max_messages_per_day))}`}
                  style={{ width: limits.max_messages_per_day === -1 ? '20%' : `${getUsagePercentage(usage.messages_today, limits.max_messages_per_day)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>{planInfo[subscriptionTier]?.name || 'Your Plan'} Includes:</strong>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                {limits.max_chatbots === -1 ? 'Unlimited' : limits.max_chatbots} Chatbot{limits.max_chatbots !== 1 ? 's' : ''}
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                {limits.max_documents_per_chatbot === -1 ? 'Unlimited' : limits.max_documents_per_chatbot} Documents per chatbot
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                {limits.max_messages_per_day === -1 ? 'Unlimited' : limits.max_messages_per_day} Messages per day
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                {limits.max_file_size_mb}MB max file size
              </li>
            </ul>
          </div>
        </div>

        {/* Subscription Plans - Coming Soon */}
        <div className="bg-white rounded-xl shadow-sm p-6 relative overflow-hidden">
          {/* Coming Soon Overlay */}
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Subscriptions Coming Soon</h3>
              <p className="text-gray-600 max-w-sm">
                We're working on premium plans with more features. Stay tuned!
              </p>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-6">Upgrade Your Plan</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pro Plan */}
            <div className="border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Pro</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-4">$29<span className="text-sm font-normal text-gray-500">/month</span></p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  10 Chatbots
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  50 Documents per chatbot
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  1,000 Messages per day
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  25MB max file size
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Priority support
                </li>
              </ul>
              <button disabled className="w-full py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed">
                Coming Soon
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="border-2 border-purple-200 bg-purple-50 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Enterprise</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-4">$99<span className="text-sm font-normal text-gray-500">/month</span></p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Unlimited Chatbots
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Unlimited Documents
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Unlimited Messages
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  100MB max file size
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Dedicated support
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Custom integrations
                </li>
              </ul>
              <button disabled className="w-full py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed">
                Coming Soon
              </button>
            </div>
          </div>
        </div>

        {/* API Keys Management */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
              <p className="text-sm text-gray-500 mt-1">Manage your API keys for programmatic access</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Key
            </button>
          </div>

          {keysLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <Key className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No API keys yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first API key to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div key={key.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">{key.name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          key.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {key.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {visibleKeys[key.id] ? key.key_preview : maskKey(key.key_preview)}
                        </code>
                        <button
                          onClick={() => setVisibleKeys(v => ({ ...v, [key.id]: !v[key.id] }))}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          {visibleKeys[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(key.key_preview)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Copy"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Scopes: {key.scopes?.join(', ')}</span>
                        <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                        {key.last_used_at && <span>Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {key.status === 'active' && (
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="px-3 py-1.5 text-sm text-yellow-600 hover:bg-yellow-50 rounded"
                        >
                          Revoke
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium text-gray-900 mb-3">API Endpoints</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-mono text-gray-700">
                POST /api/v1/chat/&#123;bot_id&#125;/message
              </p>
              <p className="text-xs text-gray-500">
                Include your API key in the Authorization header: Bearer YOUR_API_KEY
              </p>
            </div>
          </div>
        </div>

        {/* Create API Key Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create API Key</h3>

              {createdKey ? (
                <div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-green-800 mb-2">
                      Your API key has been created. Copy it now - you won't be able to see it again!
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-white px-3 py-2 rounded border break-all">
                        {createdKey.key}
                      </code>
                      <button
                        onClick={() => copyToClipboard(createdKey.key)}
                        className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowCreateModal(false); setCreatedKey(null); }}
                    className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g., Production Key"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
                      <div className="space-y-2">
                        {['read', 'write', 'admin'].map((scope) => (
                          <label key={scope} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newKeyScopes.includes(scope)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewKeyScopes([...newKeyScopes, scope]);
                                } else {
                                  setNewKeyScopes(newKeyScopes.filter(s => s !== scope));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600"
                            />
                            <span className="text-sm text-gray-700 capitalize">{scope}</span>
                            <span className="text-xs text-gray-500">
                              {scope === 'read' && '- Read chatbot data and messages'}
                              {scope === 'write' && '- Send messages and update data'}
                              {scope === 'admin' && '- Full access including delete'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateKey}
                      disabled={creating || !newKeyName.trim() || newKeyScopes.length === 0}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                      Create Key
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Account Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          <div className="flex items-center justify-between py-3 border-b">
            <span className="text-gray-600">Account ID</span>
            <span className="font-mono text-sm text-gray-900">{user?.id}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <span className="text-gray-600">Member since</span>
            <span className="text-gray-900">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-600">Plan</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${planInfo[subscriptionTier]?.color || 'bg-gray-100 text-gray-800'}`}>
              {planInfo[subscriptionTier]?.name?.replace(' Plan', '') || 'Free'}
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
