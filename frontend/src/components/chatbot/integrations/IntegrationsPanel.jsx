import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Link2, Check, Loader2 } from 'lucide-react';
import { integrations, chatbots } from '@/utils/api';
import IntegrationCard from '@/components/IntegrationCard';
import FileBrowser from '@/components/FileBrowser';

const PROVIDERS = ['google_drive', 'gmail', 'notion', 'slack', 'hubspot'];
const PROVIDER_NAMES = {
  google_drive: 'Google Drive',
  gmail: 'Gmail',
  notion: 'Notion',
  slack: 'Slack',
  hubspot: 'HubSpot',
};

const IntegrationsPanel = () => {
  const { bot } = useOutletContext();

  const [integrationsData, setIntegrationsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState(null);
  const [browsingProvider, setBrowsingProvider] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);

  useEffect(() => {
    loadIntegrations();
  }, [bot?.id]);

  const loadIntegrations = async () => {
    if (!bot?.id) return;
    setLoading(true);
    try {
      const response = await integrations.list(bot.id);
      setIntegrationsData(response.data.integrations || []);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider) => {
    setConnectingProvider(provider);
    try {
      const response = await integrations.getAuthUrl(provider, bot.id);
      window.location.href = response.data.auth_url;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      setConnectingProvider(null);
    }
  };

  const handleDisconnect = async (provider) => {
    if (!confirm(`Disconnect ${PROVIDER_NAMES[provider]}? Imported documents will be kept.`)) return;

    try {
      await integrations.disconnect(bot.id, provider);
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
    // Refresh documents list (they can see in Knowledge tab)
    loadIntegrations();
  };

  const getIntegrationForProvider = (provider) => {
    return integrationsData.find(i => i.provider === provider);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          <h3 className="text-lg font-semibold text-gray-900">Data Sources</h3>
          <p className="text-sm text-gray-500">Connect external services to import documents</p>
        </div>
      </div>

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

      {/* File Browser Modal */}
      {browsingProvider && (
        <FileBrowser
          botId={bot.id}
          provider={browsingProvider}
          providerName={PROVIDER_NAMES[browsingProvider]}
          onClose={() => setBrowsingProvider(null)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
};

export { IntegrationsPanel };
