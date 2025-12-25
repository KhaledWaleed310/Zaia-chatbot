import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { messenger } from '@/utils/api';

const MessengerPageSelectModal = ({ botId, sessionId, onClose, onConnected }) => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPageId, setSelectedPageId] = useState(null);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await messenger.getPages(botId, sessionId);
      setPages(response.data.pages || []);

      if (response.data.pages?.length === 0) {
        setError('No Facebook Pages found. Make sure you have admin access to at least one Page.');
      }
    } catch (err) {
      console.error('Failed to load pages:', err);
      if (err.response?.status === 410) {
        setError('Session expired. Please try connecting again.');
      } else {
        setError(err.response?.data?.detail || 'Failed to load Facebook Pages');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedPageId) return;

    try {
      setConnecting(true);
      setError(null);
      await messenger.connectPage(botId, selectedPageId, sessionId);
      onConnected();
    } catch (err) {
      console.error('Failed to connect page:', err);
      setError(err.response?.data?.detail || 'Failed to connect page');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Select a Facebook Page</h2>
            <p className="text-sm text-gray-500">Choose which Page to connect to your chatbot</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm text-red-700">{error}</p>
                {error.includes('expired') && (
                  <button
                    onClick={onClose}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Close and try again
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setSelectedPageId(page.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    selectedPageId === page.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page.picture_url ? (
                    <img
                      src={page.picture_url}
                      alt={page.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-lg font-semibold">
                        {page.name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{page.name}</p>
                    {page.category && (
                      <p className="text-sm text-gray-500">{page.category}</p>
                    )}
                  </div>
                  {selectedPageId === page.id && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={!selectedPageId || connecting || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-2"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Page'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export { MessengerPageSelectModal };
