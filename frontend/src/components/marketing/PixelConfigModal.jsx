import { useState } from 'react';
import { X, Save, Loader2, Facebook, BarChart3, AlertCircle, CheckCircle, Code, Info, ExternalLink, TestTube } from 'lucide-react';
import { marketing } from '../../utils/api';

const PixelConfigModal = ({ config, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('facebook');
  const [formData, setFormData] = useState({
    facebook_pixel_id: config?.facebook_pixel_id || '',
    facebook_pixel_code: config?.facebook_pixel_code || '',
    google_analytics_id: config?.google_analytics_id || '',
    google_analytics_code: config?.google_analytics_code || '',
    custom_head_code: config?.custom_head_code || '',
    custom_body_code: config?.custom_body_code || '',
    enabled: config?.enabled ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      await marketing.updatePixelConfig(formData);
      setSuccess('Pixel configuration saved successfully!');
      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'facebook', label: 'Facebook Pixel', icon: Facebook, color: 'text-blue-600' },
    { id: 'google', label: 'Google Analytics', icon: BarChart3, color: 'text-orange-600' },
    { id: 'custom', label: 'Custom Code', icon: Code, color: 'text-gray-600' },
    { id: 'verify', label: 'Verify', icon: TestTube, color: 'text-green-600' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Pixel & Tracking Configuration</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Facebook Tab */}
          {activeTab === 'facebook' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">How to get your Facebook Pixel code:</p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Go to Facebook Events Manager</li>
                      <li>Select your Pixel or create a new one</li>
                      <li>Click "Add Events" → "From a New Website"</li>
                      <li>Choose "Install code manually"</li>
                      <li>Copy the entire code snippet and paste it below</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facebook Pixel ID (optional)
                </label>
                <input
                  type="text"
                  value={formData.facebook_pixel_id}
                  onChange={(e) => setFormData({ ...formData, facebook_pixel_id: e.target.value })}
                  placeholder="e.g., 123456789012345"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Just the numeric ID for reference</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facebook Pixel Embed Code
                </label>
                <textarea
                  value={formData.facebook_pixel_code}
                  onChange={(e) => setFormData({ ...formData, facebook_pixel_code: e.target.value })}
                  placeholder={`<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{...your pixel code...}
</script>
<!-- End Facebook Pixel Code -->`}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste the complete script tag from Facebook
                </p>
              </div>
            </div>
          )}

          {/* Google Analytics Tab */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <Info className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-medium">How to get your Google Analytics code:</p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Go to Google Analytics</li>
                      <li>Admin → Data Streams → Select your stream</li>
                      <li>Click "View tag instructions"</li>
                      <li>Select "Install manually"</li>
                      <li>Copy the entire code snippet and paste it below</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GA4 Measurement ID (optional)
                </label>
                <input
                  type="text"
                  value={formData.google_analytics_id}
                  onChange={(e) => setFormData({ ...formData, google_analytics_id: e.target.value.toUpperCase() })}
                  placeholder="e.g., G-XXXXXXXXXX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Your GA4 Measurement ID for reference</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Analytics Embed Code
                </label>
                <textarea
                  value={formData.google_analytics_code}
                  onChange={(e) => setFormData({ ...formData, google_analytics_code: e.target.value })}
                  placeholder={`<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>`}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste the complete script tag from Google Analytics
                </p>
              </div>
            </div>
          )}

          {/* Custom Code Tab */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <Info className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">Custom Tracking Code</p>
                    <p className="mt-1">
                      Add any additional tracking scripts like TikTok Pixel, LinkedIn Insight Tag,
                      Hotjar, or any other marketing tools.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Head Code
                </label>
                <textarea
                  value={formData.custom_head_code}
                  onChange={(e) => setFormData({ ...formData, custom_head_code: e.target.value })}
                  placeholder={`<!-- Add any scripts that should go in the <head> section -->
<script>
  // Your tracking code here
</script>`}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This code will be injected into the &lt;head&gt; section
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Body Code
                </label>
                <textarea
                  value={formData.custom_body_code}
                  onChange={(e) => setFormData({ ...formData, custom_body_code: e.target.value })}
                  placeholder={`<!-- Add any scripts that should go at the end of <body> -->
<noscript>
  <!-- Fallback for users without JavaScript -->
</noscript>`}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This code will be injected at the end of the &lt;body&gt; section
                </p>
              </div>
            </div>
          )}

          {/* Verify Tab */}
          {activeTab === 'verify' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <TestTube className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium">How to Verify Your Pixels</p>
                    <p className="mt-1">
                      After saving your pixel codes, follow these steps to verify they're working correctly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 1: Save Configuration */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Step 1: Save Your Configuration</h4>
                <p className="text-sm text-gray-600">
                  Make sure you've pasted your pixel codes in the Facebook or Google tabs and clicked "Save Configuration".
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {(config?.facebook_pixel_code || config?.google_analytics_code) ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4" /> Codes saved
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-600 text-sm">
                      <AlertCircle className="w-4 h-4" /> No codes saved yet
                    </span>
                  )}
                </div>
              </div>

              {/* Step 2: Install Browser Extensions */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Step 2: Install Browser Extensions</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Install these free browser extensions to verify your pixels:
                </p>
                <div className="space-y-2">
                  <a
                    href="https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Facebook className="w-4 h-4" />
                    Facebook Pixel Helper (Chrome)
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Google Tag Assistant (Chrome)
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Step 3: Test on Landing Page */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Step 3: Visit Your Landing Page</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Open your landing page with the browser extensions enabled. They will show if your pixels are firing correctly.
                </p>
                <button
                  onClick={() => window.open('/', '_blank')}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Landing Page in New Tab
                </button>
              </div>

              {/* Step 4: Check Platform Dashboards */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Step 4: Check Platform Dashboards</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Verify events are being received in your ad platform dashboards:
                </p>
                <div className="space-y-2">
                  <a
                    href="https://business.facebook.com/events_manager"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Facebook className="w-4 h-4" />
                    Facebook Events Manager
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://analytics.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Google Analytics (Realtime)
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Internal Tracking Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Internal Tracking</p>
                    <p className="mt-1">
                      Our internal tracking (landing views, signups, chat opens) works automatically without any pixel setup.
                      Check the Marketing Dashboard to see this data in real-time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Enable Tracking</p>
              <p className="text-sm text-gray-500">
                When enabled, tracking codes will be active on your landing page
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.enabled ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PixelConfigModal;
