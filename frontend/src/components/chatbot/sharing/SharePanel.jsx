import { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import {
  Share2,
  Lock,
  Unlock,
  Copy,
  ExternalLink,
  Check,
  Eye,
  EyeOff,
  Loader2,
  MessageCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Unlink
} from 'lucide-react';
import { chatbots, messenger } from '@/utils/api';
import { MessengerPageSelectModal } from './MessengerPageSelectModal';

const SharePanel = () => {
  const { bot, reloadBot } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isPublic, setIsPublic] = useState(bot?.is_public || false);
  const [sharePassword, setSharePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Messenger integration state
  const [messengerConfig, setMessengerConfig] = useState(null);
  const [messengerLoading, setMessengerLoading] = useState(true);
  const [messengerConnecting, setMessengerConnecting] = useState(false);
  const [messengerError, setMessengerError] = useState(null);
  const [showPageSelectModal, setShowPageSelectModal] = useState(false);
  const [oauthSessionId, setOauthSessionId] = useState(null);

  useEffect(() => {
    if (bot) {
      setIsPublic(bot.is_public || false);
      loadMessengerConfig();
    }
  }, [bot]);

  // Handle OAuth callback from Facebook
  useEffect(() => {
    const messengerParam = searchParams.get('messenger');
    const sessionParam = searchParams.get('session');

    if (messengerParam === 'select_page' && sessionParam) {
      setOauthSessionId(sessionParam);
      setShowPageSelectModal(true);
      // Clear the URL params
      searchParams.delete('messenger');
      searchParams.delete('session');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const loadMessengerConfig = async () => {
    if (!bot?.id) return;

    try {
      setMessengerLoading(true);
      setMessengerError(null);
      const response = await messenger.getConfig(bot.id);
      setMessengerConfig(response.data);
    } catch (error) {
      console.error('Failed to load Messenger config:', error);
      if (error.response?.status !== 503) {
        setMessengerError('Failed to load Messenger configuration');
      }
    } finally {
      setMessengerLoading(false);
    }
  };

  const handleConnectMessenger = async () => {
    try {
      setMessengerConnecting(true);
      setMessengerError(null);

      const response = await messenger.getAuthUrl(bot.id);
      const authUrl = response.data.auth_url;

      // Open Facebook OAuth in a popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      window.open(
        authUrl,
        'facebook_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error('Failed to get Messenger auth URL:', error);
      setMessengerError(error.response?.data?.detail || 'Failed to connect to Facebook');
    } finally {
      setMessengerConnecting(false);
    }
  };

  const handlePageSelected = async () => {
    setShowPageSelectModal(false);
    setOauthSessionId(null);
    await loadMessengerConfig();
  };

  const handleDisconnectMessenger = async () => {
    if (!confirm('Disconnect Facebook Messenger? Your chatbot will no longer receive messages from this Page.')) {
      return;
    }

    try {
      setMessengerConnecting(true);
      await messenger.disconnect(bot.id);
      await loadMessengerConfig();
    } catch (error) {
      console.error('Failed to disconnect Messenger:', error);
      setMessengerError(error.response?.data?.detail || 'Failed to disconnect');
    } finally {
      setMessengerConnecting(false);
    }
  };

  const handleToggleMessenger = async (enabled) => {
    try {
      await messenger.toggle(bot.id, enabled);
      await loadMessengerConfig();
    } catch (error) {
      console.error('Failed to toggle Messenger:', error);
    }
  };

  const handleSaveShare = async () => {
    setSaving(true);
    try {
      const updateData = {
        is_public: isPublic,
      };
      if (sharePassword) {
        updateData.share_password = sharePassword;
      }

      await chatbots.update(bot.id, updateData);
      await reloadBot();
      setSharePassword('');
    } catch (error) {
      console.error('Failed to save share settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!confirm('Remove password protection? Anyone with the link will be able to access the chatbot.')) return;

    setSaving(true);
    try {
      await chatbots.update(bot.id, { share_password: '' });
      await reloadBot();
    } catch (error) {
      console.error('Failed to remove password:', error);
    } finally {
      setSaving(false);
    }
  };

  const copyShareLink = () => {
    const link = bot?.share_link || `${window.location.origin}/chat/${bot.id}`;
    navigator.clipboard.writeText(link);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <Share2 className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Share Settings</h3>
            <p className="text-sm text-gray-500">Share your chatbot with a public link</p>
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
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Share Link</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={bot?.share_link || `${window.location.origin}/chat/${bot?.id}`}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600"
                />
                <div className="flex gap-2">
                  <button
                    onClick={copyShareLink}
                    className="flex-1 sm:flex-none px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
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
                    href={bot?.share_link || `/chat/${bot?.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </a>
                </div>
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
        <div className="mt-6">
          <button
            onClick={handleSaveShare}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {saving ? (
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

      {/* Facebook Messenger Integration */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Facebook Messenger</h3>
            <p className="text-sm text-gray-500">Connect your chatbot to a Facebook Page</p>
          </div>
        </div>

        {messengerLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : !messengerConfig?.is_configured ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Not Configured</p>
                <p className="text-sm text-amber-700 mt-1">
                  Facebook Messenger integration requires admin setup. Please contact support.
                </p>
              </div>
            </div>
          </div>
        ) : messengerConfig?.is_connected ? (
          // Connected state
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    Connected to {messengerConfig.connection?.page_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {messengerConfig.connection?.message_count || 0} messages received
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggleMessenger(!messengerConfig.connection?.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  messengerConfig.connection?.enabled ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    messengerConfig.connection?.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {messengerConfig.connection?.status === 'error' && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Connection Error</p>
                  <p className="text-sm text-red-700">
                    {messengerConfig.connection?.error_message || 'An error occurred with the connection'}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleDisconnectMessenger}
              disabled={messengerConnecting}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
            >
              {messengerConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4" />
              )}
              Disconnect Page
            </button>
          </div>
        ) : (
          // Not connected state
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Connect your Facebook Page to receive and respond to Messenger messages directly through Aiden.
                Messages from your Page's Messenger will be answered by your chatbot.
              </p>
            </div>

            {messengerError && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{messengerError}</p>
              </div>
            )}

            <button
              onClick={handleConnectMessenger}
              disabled={messengerConnecting}
              className="flex items-center gap-2 px-6 py-3 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5] transition-colors text-sm"
            >
              {messengerConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 15.05 3.5 17.72 5.91 19.43V22L8.31 20.53C9.12 20.77 9.99 20.9 10.88 20.9C11.25 20.9 11.62 20.88 12 20.84C11.55 19.9 11.29 18.85 11.29 17.74C11.29 13.89 14.29 10.77 18.14 10.77C18.58 10.77 19.01 10.81 19.43 10.88C18.78 5.89 15.83 2.04 12 2.04M7.89 14.5L10.77 11.54L13.09 14.32L17.81 9.5L15 12.42L12.66 9.68L7.89 14.5Z"/>
                </svg>
              )}
              Connect Facebook Page
            </button>
          </div>
        )}
      </div>

      {/* Page Selection Modal */}
      {showPageSelectModal && oauthSessionId && (
        <MessengerPageSelectModal
          botId={bot.id}
          sessionId={oauthSessionId}
          onClose={() => {
            setShowPageSelectModal(false);
            setOauthSessionId(null);
          }}
          onConnected={handlePageSelected}
        />
      )}
    </div>
  );
};

export { SharePanel };
