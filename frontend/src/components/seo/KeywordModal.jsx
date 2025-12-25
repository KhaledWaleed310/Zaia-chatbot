import { useState } from 'react';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';

const KeywordModal = ({ keyword, pages, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    keyword: keyword?.keyword || '',
    target_pages: keyword?.target_pages || [],
    priority: keyword?.priority || 'medium',
    notes: keyword?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.keyword.trim()) {
      setError('Keyword is required');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await onSave(formData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save keyword');
    } finally {
      setSaving(false);
    }
  };

  const togglePage = (pageId) => {
    const current = formData.target_pages;
    if (current.includes(pageId)) {
      setFormData({
        ...formData,
        target_pages: current.filter((p) => p !== pageId),
      });
    } else {
      setFormData({
        ...formData,
        target_pages: [...current, pageId],
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {keyword ? 'Edit Keyword' : 'Add Keyword'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Keyword */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keyword</label>
            <input
              type="text"
              value={formData.keyword}
              onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., AI chatbot"
              autoFocus
            />
          </div>

          {/* Target Pages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Pages</label>
            <div className="space-y-2">
              {pages.map((page) => (
                <label
                  key={page.page_id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={formData.target_pages.includes(page.page_id)}
                    onChange={() => togglePage(page.page_id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{page.page_name}</span>
                    <span className="text-xs text-gray-400 ml-2">{page.url}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Strategy notes, search volume, competition level..."
            />
          </div>
        </form>

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
            {saving ? 'Saving...' : keyword ? 'Save Changes' : 'Add Keyword'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeywordModal;
