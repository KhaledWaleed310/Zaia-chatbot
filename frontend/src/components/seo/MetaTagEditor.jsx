import { useState } from 'react';
import { X, Save, Loader2, Eye, AlertCircle } from 'lucide-react';

const MetaTagEditor = ({ page, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: page.title || '',
    description: page.description || '',
    keywords: page.keywords?.join(', ') || '',
    og_title: page.og_title || '',
    og_description: page.og_description || '',
    og_image: page.og_image || '',
    canonical_url: page.canonical_url || '',
    robots: page.robots || 'index, follow',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      await onSave(page.page_id, {
        ...formData,
        keywords: formData.keywords
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k),
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save SEO settings');
    } finally {
      setSaving(false);
    }
  };

  const getTitleStatus = () => {
    const len = formData.title.length;
    if (len === 0) return { status: 'error', message: 'Title is required' };
    if (len < 30) return { status: 'warning', message: `Too short (${len}/60)` };
    if (len > 60) return { status: 'warning', message: `May be truncated (${len}/60)` };
    return { status: 'ok', message: `Good length (${len}/60)` };
  };

  const getDescriptionStatus = () => {
    const len = formData.description.length;
    if (len === 0) return { status: 'error', message: 'Description is required' };
    if (len < 120) return { status: 'warning', message: `Too short (${len}/160)` };
    if (len > 160) return { status: 'warning', message: `May be truncated (${len}/160)` };
    return { status: 'ok', message: `Good length (${len}/160)` };
  };

  const titleStatus = getTitleStatus();
  const descStatus = getDescriptionStatus();

  const getStatusColor = (status) => {
    switch (status) {
      case 'ok':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit SEO: {page.page_name}</h2>
            <p className="text-sm text-gray-500">{page.url}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Title Tag</label>
                <span className={`text-xs ${getStatusColor(titleStatus.status)}`}>
                  {titleStatus.message}
                </span>
              </div>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Page title for search engines"
              />
              <p className="mt-1 text-xs text-gray-500">Ideal: 50-60 characters</p>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Meta Description</label>
                <span className={`text-xs ${getStatusColor(descStatus.status)}`}>
                  {descStatus.message}
                </span>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description for search results"
              />
              <p className="mt-1 text-xs text-gray-500">Ideal: 120-160 characters</p>
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="keyword1, keyword2, keyword3"
              />
              <p className="mt-1 text-xs text-gray-500">Comma-separated list of target keywords</p>
            </div>

            {/* Open Graph Section */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Open Graph (Social Sharing)</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OG Title</label>
                  <input
                    type="text"
                    value={formData.og_title}
                    onChange={(e) => setFormData({ ...formData, og_title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Title for social media (defaults to title tag if empty)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OG Description</label>
                  <textarea
                    value={formData.og_description}
                    onChange={(e) => setFormData({ ...formData, og_description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Description for social media"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OG Image URL</label>
                  <input
                    type="text"
                    value={formData.og_image}
                    onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="/og-image.svg or https://..."
                  />
                </div>
              </div>
            </div>

            {/* Technical Section */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Technical SEO</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Canonical URL</label>
                  <input
                    type="text"
                    value={formData.canonical_url}
                    onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://aidenlink.cloud/page"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Prevents duplicate content issues
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Robots Directive</label>
                  <select
                    value={formData.robots}
                    onChange={(e) => setFormData({ ...formData, robots: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="index, follow">index, follow (default)</option>
                    <option value="index, nofollow">index, nofollow</option>
                    <option value="noindex, follow">noindex, follow</option>
                    <option value="noindex, nofollow">noindex, nofollow</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SERP Preview */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-900">Google Search Preview</h3>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-blue-700 text-lg font-medium truncate hover:underline cursor-pointer">
                  {formData.title || 'Page Title'}
                </p>
                <p className="text-green-700 text-sm truncate">
                  {formData.canonical_url || `https://aidenlink.cloud${page.url}`}
                </p>
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                  {formData.description || 'Meta description will appear here...'}
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetaTagEditor;
