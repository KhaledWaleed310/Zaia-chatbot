import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import IntegrationCard from '../components/IntegrationCard';
import FileBrowser from '../components/FileBrowser';
import { chatbots, integrations, leads, handoff, translation } from '../utils/api';
import {
  MessageSquare,
  Upload,
  Trash2,
  Code,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  Link2,
  Share2,
  Lock,
  Unlock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  BarChart3,
  Users,
  Phone,
  Globe,
} from 'lucide-react';

const PROVIDERS = ['google_drive', 'gmail', 'notion', 'slack', 'hubspot'];
const PROVIDER_NAMES = {
  google_drive: 'Google Drive',
  gmail: 'Gmail',
  notion: 'Notion',
  slack: 'Slack',
  hubspot: 'HubSpot',
};

const ChatbotDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const [bot, setBot] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [embedCode, setEmbedCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'settings');
  const [copied, setCopied] = useState(false);

  // Integrations state
  const [integrationsData, setIntegrationsData] = useState([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState(null);
  const [browsingProvider, setBrowsingProvider] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);

  // Share state
  const [isPublic, setIsPublic] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingShare, setSavingShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Feature toggles state
  const [leadFormEnabled, setLeadFormEnabled] = useState(false);
  const [handoffEnabled, setHandoffEnabled] = useState(false);
  const [multiLanguageEnabled, setMultiLanguageEnabled] = useState(false);
  const [savingFeatures, setSavingFeatures] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    system_prompt: '',
    welcome_message: '',
    primary_color: '#3B82F6',
    text_color: '#FFFFFF',
    position: 'bottom-right',
  });

  useEffect(() => {
    loadChatbot();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'integrations') {
      loadIntegrations();
    }
  }, [activeTab, id]);

  // Check for OAuth callback success
  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected) {
      setActiveTab('integrations');
      loadIntegrations();
    }
  }, [searchParams]);

  const loadChatbot = async () => {
    try {
      const [botRes, docsRes, embedRes, leadConfigRes, handoffConfigRes, langConfigRes] = await Promise.all([
        chatbots.get(id),
        chatbots.listDocuments(id),
        chatbots.getEmbed(id),
        leads.getFormConfig(id).catch(() => ({ data: { enabled: false } })),
        handoff.getConfig(id).catch(() => ({ data: { enabled: false } })),
        translation.getConfig(id).catch(() => ({ data: { enabled: false } })),
      ]);

      setBot(botRes.data);
      setDocuments(docsRes.data);
      setEmbedCode(embedRes.data);

      setFormData({
        name: botRes.data.name,
        system_prompt: botRes.data.system_prompt || '',
        welcome_message: botRes.data.welcome_message || '',
        primary_color: botRes.data.primary_color || '#3B82F6',
        text_color: botRes.data.text_color || '#FFFFFF',
        position: botRes.data.position || 'bottom-right',
      });

      // Set share state
      setIsPublic(botRes.data.is_public || false);

      // Set feature toggles
      setLeadFormEnabled(leadConfigRes.data?.enabled || false);
      setHandoffEnabled(handoffConfigRes.data?.enabled || false);
      setMultiLanguageEnabled(langConfigRes.data?.enabled || false);
    } catch (error) {
      console.error('Failed to load chatbot:', error);
      navigate('/chatbots');
    } finally {
      setLoading(false);
    }
  };

  // Share handlers
  const handleSaveShare = async () => {
    setSavingShare(true);
    try {
      const updateData = {
        is_public: isPublic,
      };
      // Only send password if it's set (to update) or if we want to remove it
      if (sharePassword) {
        updateData.share_password = sharePassword;
      }

      const response = await chatbots.update(id, updateData);
      setBot(response.data);
      setSharePassword(''); // Clear password field after save
    } catch (error) {
      console.error('Failed to save share settings:', error);
    } finally {
      setSavingShare(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!confirm('Remove password protection? Anyone with the link will be able to access the chatbot.')) return;

    setSavingShare(true);
    try {
      const response = await chatbots.update(id, { share_password: '' });
      setBot(response.data);
    } catch (error) {
      console.error('Failed to remove password:', error);
    } finally {
      setSavingShare(false);
    }
  };

  const copyShareLink = () => {
    if (bot?.share_link) {
      navigator.clipboard.writeText(bot.share_link);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const loadIntegrations = async () => {
    setLoadingIntegrations(true);
    try {
      const response = await integrations.list(id);
      setIntegrationsData(response.data.integrations || []);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await chatbots.update(id, formData);
      setBot((prev) => ({ ...prev, ...formData }));
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  // Feature toggle handlers
  const handleToggleLeadForm = async (enabled) => {
    setSavingFeatures(true);
    try {
      await leads.updateFormConfig(id, { enabled });
      setLeadFormEnabled(enabled);
    } catch (error) {
      console.error('Failed to update lead form:', error);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleToggleHandoff = async (enabled) => {
    setSavingFeatures(true);
    try {
      await handoff.updateConfig(id, { enabled });
      setHandoffEnabled(enabled);
    } catch (error) {
      console.error('Failed to update handoff:', error);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleToggleMultiLanguage = async (enabled) => {
    setSavingFeatures(true);
    try {
      await translation.updateConfig(id, { enabled });
      setMultiLanguageEnabled(enabled);
    } catch (error) {
      console.error('Failed to update language config:', error);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await chatbots.uploadDocument(id, file);
      setDocuments((prev) => [...prev, response.data]);
      pollDocumentStatus(response.data.id);
    } catch (error) {
      console.error('Failed to upload:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const pollDocumentStatus = async (docId) => {
    const interval = setInterval(async () => {
      try {
        const response = await chatbots.listDocuments(id);
        const doc = response.data.find((d) => d.id === docId);
        if (doc && doc.status !== 'processing') {
          setDocuments(response.data);
          clearInterval(interval);
        }
      } catch (error) {
        clearInterval(interval);
      }
    }, 3000);
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Delete this document?')) return;

    try {
      await chatbots.deleteDocument(id, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode?.full_snippet || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Integration handlers
  const handleConnect = async (provider) => {
    setConnectingProvider(provider);
    try {
      const response = await integrations.getAuthUrl(provider, id);
      window.location.href = response.data.auth_url;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      setConnectingProvider(null);
    }
  };

  const handleDisconnect = async (provider) => {
    if (!confirm(`Disconnect ${PROVIDER_NAMES[provider]}? Imported documents will be kept.`)) return;

    try {
      await integrations.disconnect(id, provider);
      loadIntegrations();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleBrowse = (provider) => {
    setBrowsingProvider(provider);
  };

  const handleImportComplete = (count) => {
    setImportSuccess(`Successfully imported ${count} item${count > 1 ? 's' : ''}!`);
    setTimeout(() => setImportSuccess(null), 5000);
    // Refresh documents list
    chatbots.listDocuments(id).then(res => setDocuments(res.data));
    loadIntegrations();
  };

  const getIntegrationForProvider = (provider) => {
    return integrationsData.find(i => i.provider === provider);
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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{bot?.name}</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Configure and manage your chatbot</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <nav className="flex space-x-4 sm:space-x-8 min-w-max sm:min-w-0">
            {['settings', 'documents', 'integrations', 'share', 'embed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm sm:text-base capitalize whitespace-nowrap min-h-[44px] ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={() => navigate(`/chatbots/${id}/analytics`)}
              className="py-3 sm:py-4 px-1 border-b-2 border-transparent font-medium text-sm sm:text-base whitespace-nowrap min-h-[44px] text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
            <button
              onClick={() => navigate(`/chatbots/${id}/leads`)}
              className="py-3 sm:py-4 px-1 border-b-2 border-transparent font-medium text-sm sm:text-base whitespace-nowrap min-h-[44px] text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              Leads
            </button>
            <button
              onClick={() => navigate(`/chatbots/${id}/handoff`)}
              className="py-3 sm:py-4 px-1 border-b-2 border-transparent font-medium text-sm sm:text-base whitespace-nowrap min-h-[44px] text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              Live Chat
            </button>
          </nav>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">System Prompt</label>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData((prev) => ({ ...prev, system_prompt: e.target.value }))}
                rows={4}
                className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Welcome Message</label>
              <input
                type="text"
                value={formData.welcome_message}
                onChange={(e) => setFormData((prev) => ({ ...prev, welcome_message: e.target.value }))}
                className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData((prev) => ({ ...prev, primary_color: e.target.value }))}
                    className="w-12 h-12 rounded-lg cursor-pointer flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => setFormData((prev) => ({ ...prev, primary_color: e.target.value }))}
                    className="flex-1 px-3 sm:px-4 py-3 border border-gray-300 rounded-lg text-sm sm:text-base min-h-[44px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
                  className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base min-h-[44px]"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>
            </div>

            <div className="pt-2 sm:pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px] text-sm sm:text-base"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Feature Toggles Section */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 max-w-2xl mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Chat Widget Features</h3>
            <p className="text-sm text-gray-500 mb-6">Enable or disable features in your chat widget</p>

            <div className="space-y-4">
              {/* Lead Capture Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Lead Capture Form</p>
                    <p className="text-sm text-gray-500">Collect visitor information</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleLeadForm(!leadFormEnabled)}
                  disabled={savingFeatures}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                    leadFormEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      leadFormEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Human Handoff Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Human Handoff</p>
                    <p className="text-sm text-gray-500">Allow visitors to request live chat</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleHandoff(!handoffEnabled)}
                  disabled={savingFeatures}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                    handoffEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      handoffEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Multi-Language Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Globe className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Multi-Language</p>
                    <p className="text-sm text-gray-500">Show language selector in widget</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleMultiLanguage(!multiLanguageEnabled)}
                  disabled={savingFeatures}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                    multiLanguageEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      multiLanguageEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Click the Leads or Live Chat tabs above for detailed configuration
            </p>
          </div>
          </>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Knowledge Base</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Upload documents to train your chatbot</p>
                </div>
                <label className="flex items-center justify-center px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer min-h-[44px] text-sm sm:text-base whitespace-nowrap">
                  <Upload className="w-5 h-5 mr-2 flex-shrink-0" />
                  {uploading ? 'Uploading...' : 'Upload Document'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-8 sm:py-12 border-2 border-dashed rounded-lg">
                  <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm sm:text-base text-gray-500">No documents uploaded yet</p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">Supports PDF, DOCX, and TXT files</p>
                </div>
              ) : (
                <div className="divide-y">
                  {documents.map((doc) => (
                    <div key={doc.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="flex items-center min-w-0 flex-1">
                        <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 flex-shrink-0" />
                        <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{doc.filename}</p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            {doc.chunks_count || 0} chunks • {(doc.size / 1024).toFixed(1)} KB
                            {doc.source_type && doc.source_type !== 'upload' && (
                              <span className="ml-2 text-blue-600">• {PROVIDER_NAMES[doc.source_type] || doc.source_type}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end space-x-4 pl-9 sm:pl-0">
                        {doc.status === 'processing' ? (
                          <span className="flex items-center text-yellow-600 text-xs sm:text-sm">
                            <Loader2 className="w-4 h-4 mr-1 animate-spin flex-shrink-0" />
                            Processing
                          </span>
                        ) : doc.status === 'completed' ? (
                          <span className="flex items-center text-green-600 text-xs sm:text-sm">
                            <Check className="w-4 h-4 mr-1 flex-shrink-0" />
                            Ready
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600 text-xs sm:text-sm">
                            <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                            Failed
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Success message */}
            {importSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <Check className="w-5 h-5" />
                {importSuccess}
              </div>
            )}

            <div className="flex items-center gap-3 mb-2">
              <Link2 className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Data Sources</h3>
                <p className="text-xs sm:text-sm text-gray-500">Connect external services to import documents</p>
              </div>
            </div>

            {loadingIntegrations ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROVIDERS.map((provider) => (
                  <IntegrationCard
                    key={provider}
                    provider={provider}
                    integration={getIntegrationForProvider(provider)}
                    onConnect={() => handleConnect(provider)}
                    onDisconnect={() => handleDisconnect(provider)}
                    onBrowse={() => handleBrowse(provider)}
                    connecting={connectingProvider === provider}
                    comingSoon={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Share Tab */}
        {activeTab === 'share' && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 max-w-2xl space-y-6">
            <div className="flex items-center gap-3">
              <Share2 className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Share Settings</h3>
                <p className="text-xs sm:text-sm text-gray-500">Share your chatbot with a public link</p>
              </div>
            </div>

            {/* Enable/Disable Sharing */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Unlock className="w-5 h-5 text-green-600" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Public Sharing</p>
                  <p className="text-sm text-gray-500">
                    {isPublic ? 'Anyone with the link can access' : 'Only accessible via embed code'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublic ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Share Link */}
            {isPublic && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Share Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bot?.share_link || `${window.location.origin}/chat/${id}`}
                      readOnly
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600"
                    />
                    <button
                      onClick={copyShareLink}
                      className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      {shareCopied ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                    <a
                      href={bot?.share_link || `/chat/${id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </a>
                  </div>
                </div>

                {/* Password Protection */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Password Protection</span>
                    {bot?.has_password && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
                    )}
                  </div>

                  {bot?.has_password ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        This chatbot is password protected. Users need to enter the password to access it.
                      </p>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={sharePassword}
                            onChange={(e) => setSharePassword(e.target.value)}
                            placeholder="Enter new password to change"
                            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <button
                          onClick={handleRemovePassword}
                          className="px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Add a password to restrict access. Only people with the password can use the chatbot.
                      </p>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={sharePassword}
                          onChange={(e) => setSharePassword(e.target.value)}
                          placeholder="Set a password (optional)"
                          className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-2">
              <button
                onClick={handleSaveShare}
                disabled={savingShare}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px] text-sm sm:text-base flex items-center justify-center gap-2"
              >
                {savingShare ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Share Settings'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Embed Tab */}
        {activeTab === 'embed' && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 max-w-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Embed Code</h3>
                <p className="text-xs sm:text-sm text-gray-500">Add this code to your website</p>
              </div>
              <button
                onClick={copyEmbedCode}
                className="flex items-center justify-center px-4 py-3 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 min-h-[44px] text-sm sm:text-base whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Code className="w-5 h-5 mr-2 flex-shrink-0" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            <div className="bg-gray-900 rounded-lg p-3 sm:p-4 overflow-x-auto">
              <pre className="text-xs sm:text-sm text-gray-100">
                <code>{embedCode?.full_snippet}</code>
              </pre>
            </div>

            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-sm sm:text-base text-blue-900 mb-2">Instructions</h4>
              <ol className="list-decimal list-inside text-xs sm:text-sm text-blue-800 space-y-1">
                <li>Copy the embed code above</li>
                <li>Paste it before the closing &lt;/body&gt; tag on your website</li>
                <li>The chat widget will appear automatically</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* File Browser Modal */}
      {browsingProvider && (
        <FileBrowser
          botId={id}
          provider={browsingProvider}
          providerName={PROVIDER_NAMES[browsingProvider]}
          onClose={() => setBrowsingProvider(null)}
          onImportComplete={handleImportComplete}
        />
      )}
    </Layout>
  );
};

export default ChatbotDetail;
