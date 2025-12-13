import { useState, useEffect } from 'react';
import {
  X,
  Folder,
  FileText,
  Mail,
  Hash,
  Database,
  File,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Search,
  Download,
} from 'lucide-react';
import { integrations } from '../utils/api';

// Icon mapping for different item types
const ITEM_ICONS = {
  folder: Folder,
  file: FileText,
  page: FileText,
  database: Database,
  channel: Hash,
  label: Folder,
  email: Mail,
};

const FileBrowser = ({ botId, provider, providerName, onClose, onImportComplete }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Home' }]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1]?.id;

  useEffect(() => {
    loadItems();
  }, [currentFolderId]);

  const loadItems = async (pageToken = null, query = null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await integrations.browse(botId, provider, currentFolderId, pageToken, query);
      if (pageToken) {
        setItems(prev => [...prev, ...response.data.items]);
      } else {
        setItems(response.data.items);
      }
      setNextPageToken(response.data.next_page_token);
    } catch (err) {
      console.error('Browse error:', err);
      setError(err.response?.data?.detail || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Reset to root and search
      setBreadcrumbs([{ id: null, name: 'Search Results' }]);
      loadItems(null, searchQuery.trim());
    }
  };

  const handleItemClick = (item) => {
    if (item.has_children || item.type === 'folder' || item.type === 'label' || item.type === 'database') {
      // Navigate into folder/label
      setBreadcrumbs(prev => [...prev, { id: item.id, name: item.name }]);
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (item, e) => {
    e.stopPropagation();
    // Can only select non-folder items
    if (item.type === 'folder' || item.type === 'label') return;

    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleSelectAll = () => {
    const selectableItems = items.filter(i => i.type !== 'folder' && i.type !== 'label');
    if (selectedItems.length === selectableItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(selectableItems);
    }
  };

  const handleBack = () => {
    if (breadcrumbs.length > 1) {
      setBreadcrumbs(prev => prev.slice(0, -1));
      setSelectedItems([]);
    }
  };

  const handleImport = async () => {
    if (selectedItems.length === 0) return;

    setImporting(true);
    setError(null);
    try {
      const itemsToImport = selectedItems.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
      }));

      await integrations.import(botId, provider, itemsToImport);
      onImportComplete?.(selectedItems.length);
      onClose();
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.detail || 'Failed to import items');
    } finally {
      setImporting(false);
    }
  };

  const getItemIcon = (type) => {
    const Icon = ITEM_ICONS[type] || File;
    return Icon;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const selectableItems = items.filter(i => i.type !== 'folder' && i.type !== 'label');
  const allSelected = selectableItems.length > 0 && selectedItems.length === selectableItems.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Browse {providerName}
            </h2>
            <p className="text-sm text-gray-500">Select files to import</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              Search
            </button>
          </form>
        </div>

        {/* Breadcrumbs */}
        <div className="px-6 py-2 border-b flex items-center gap-1 text-sm overflow-x-auto">
          {breadcrumbs.length > 1 && (
            <button
              onClick={handleBack}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />}
              <span
                className={`${
                  index === breadcrumbs.length - 1
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-500'
                } truncate max-w-[150px]`}
              >
                {crumb.name}
              </span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mb-2" />
              <p>No items found</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Select all header */}
              {selectableItems.length > 0 && (
                <div className="px-6 py-2 bg-gray-50 flex items-center">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    Select all ({selectableItems.length} items)
                  </label>
                </div>
              )}

              {/* Items list */}
              {items.map((item) => {
                const Icon = getItemIcon(item.type);
                const isSelectable = item.type !== 'folder' && item.type !== 'label';
                const isSelected = selectedItems.some(i => i.id === item.id);
                const isNavigable = item.has_children || item.type === 'folder' || item.type === 'label' || item.type === 'database';

                return (
                  <div
                    key={item.id}
                    onClick={() => isNavigable && handleItemClick(item)}
                    className={`px-6 py-3 flex items-center gap-3 ${
                      isNavigable ? 'cursor-pointer hover:bg-gray-50' : ''
                    } ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    {/* Checkbox */}
                    {isSelectable && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectItem(item, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-blue-600 rounded flex-shrink-0"
                      />
                    )}
                    {!isSelectable && <div className="w-4" />}

                    {/* Icon */}
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        item.type === 'folder' || item.type === 'label'
                          ? 'text-yellow-500'
                          : 'text-gray-400'
                      }`}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name || item.subject || 'Untitled'}
                      </p>
                      {item.snippet && (
                        <p className="text-xs text-gray-500 truncate">{item.snippet}</p>
                      )}
                      {item.sender && (
                        <p className="text-xs text-gray-500 truncate">From: {item.sender}</p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="text-xs text-gray-400 text-right flex-shrink-0">
                      {item.size && <div>{formatSize(item.size)}</div>}
                      {(item.modified_at || item.date) && (
                        <div>{formatDate(item.modified_at || item.date)}</div>
                      )}
                    </div>

                    {/* Navigate arrow */}
                    {isNavigable && (
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                );
              })}

              {/* Load more */}
              {nextPageToken && (
                <div className="px-6 py-3">
                  <button
                    onClick={() => loadItems(nextPageToken)}
                    disabled={loading}
                    className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {selectedItems.length > 0
              ? `${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''} selected`
              : 'Select items to import'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedItems.length === 0 || importing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Import {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileBrowser;
