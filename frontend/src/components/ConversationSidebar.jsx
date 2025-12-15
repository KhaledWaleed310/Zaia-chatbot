import { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronLeft,
  Loader2
} from 'lucide-react';

/**
 * Conversation Sidebar for Personal Chatbot Mode
 * Shows list of past conversations with management features
 * Overlays on mobile, side panel on desktop
 */
const ConversationSidebar = ({
  conversations = [],
  currentSessionId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onClose,
  loading = false,
  primaryColor = '#3B82F6',
  isOpen = true
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Handle rename
  const handleStartRename = (conv) => {
    setEditingId(conv.session_id);
    setEditTitle(conv.title || 'New Conversation');
  };

  const handleSaveRename = async (sessionId) => {
    if (editTitle.trim()) {
      await onRenameConversation(sessionId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditTitle('');
  };

  // Handle delete
  const handleDelete = async (sessionId) => {
    if (deleteConfirm === sessionId) {
      await onDeleteConversation(sessionId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(sessionId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  // Format relative time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  };

  const handleConversationClick = (sessionId) => {
    onSelectConversation(sessionId);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768 && onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col md:relative md:shadow-none md:border-r md:border-gray-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-gray-50">
          <h3 className="font-semibold text-gray-900 text-lg">Chats</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Close sidebar"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 flex-shrink-0">
          <button
            onClick={() => {
              onNewConversation();
              if (window.innerWidth < 768 && onClose) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl hover:opacity-90 transition-all font-medium shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            <Plus className="w-5 h-5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <span className="text-sm">Loading chats...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-gray-500 px-4">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm mt-2 text-gray-400">Start a new chat to begin!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.session_id}
                  className={`group relative rounded-xl transition-all ${
                    conv.session_id === currentSessionId
                      ? 'bg-blue-50 border-2 border-blue-300 shadow-sm'
                      : 'hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  {editingId === conv.session_id ? (
                    // Edit mode
                    <div className="p-3 flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(conv.session_id);
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                      />
                      <button
                        onClick={() => handleSaveRename(conv.session_id)}
                        className="p-2 hover:bg-green-100 rounded-lg"
                        title="Save"
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </button>
                      <button
                        onClick={handleCancelRename}
                        className="p-2 hover:bg-gray-200 rounded-lg"
                        title="Cancel"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  ) : (
                    // Normal mode
                    <div
                      className="p-3 cursor-pointer"
                      onClick={() => handleConversationClick(conv.session_id)}
                    >
                      <div className="flex items-start gap-3 pr-16">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: `${primaryColor}20` }}
                        >
                          <MessageSquare className="w-4 h-4" style={{ color: primaryColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conv.title || 'New Conversation'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTime(conv.updated_at)} • {conv.message_count} message{conv.message_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(conv);
                          }}
                          className="p-1.5 hover:bg-gray-200 rounded-lg"
                          title="Rename"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(conv.session_id);
                          }}
                          className={`p-1.5 rounded-lg ${
                            deleteConfirm === conv.session_id
                              ? 'bg-red-100'
                              : 'hover:bg-red-50'
                          }`}
                          title={deleteConfirm === conv.session_id ? 'Click again to confirm' : 'Delete'}
                        >
                          <Trash2 className={`w-4 h-4 ${
                            deleteConfirm === conv.session_id
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }`} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ConversationSidebar;
