import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { admin } from '../utils/api';
import {
  MessageSquare,
  Search,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Users,
  Globe,
  Lock,
  X,
} from 'lucide-react';

const AdminChatbots = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chatbots, setChatbots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedBot, setSelectedBot] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/dashboard');
      return;
    }
    loadChatbots();
  }, [user, navigate, pagination.page]);

  const loadChatbots = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        per_page: 20,
        ...(search && { search }),
      };
      const res = await admin.listChatbots(params);
      setChatbots(res.data.items || []);
      setPagination({
        page: res.data.page,
        pages: res.data.pages,
        total: res.data.total,
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load chatbots');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    loadChatbots();
  };

  const handleDelete = async (botId) => {
    if (!confirm('Are you sure you want to delete this chatbot and all its data? This action cannot be undone.')) return;
    try {
      setActionLoading(true);
      await admin.deleteChatbot(botId);
      loadChatbots();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete chatbot');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = async (botId) => {
    try {
      const res = await admin.getChatbot(botId);
      setSelectedBot(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to load chatbot details');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-purple-600" />
            Chatbot Management
          </h1>
          <p className="text-gray-500 mt-1">{pagination.total} total chatbots</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by chatbot name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Chatbots Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : chatbots.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No chatbots found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chatbot</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Documents</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Messages</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Visibility</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {chatbots.map((bot) => (
                    <tr key={bot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{bot.name}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{bot.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{bot.owner_email}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <FileText className="w-4 h-4" />
                          {bot.documents_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">{bot.messages_count}</td>
                      <td className="px-6 py-4 text-center">
                        {bot.is_public ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                            <Globe className="w-3 h-3" />
                            Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                            <Lock className="w-3 h-3" />
                            Private
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {bot.created_at ? new Date(bot.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(bot.id)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(bot.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                            disabled={actionLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chatbot Details Modal */}
      {selectedBot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Chatbot Details</h3>
              <button onClick={() => setSelectedBot(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{selectedBot.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Owner</p>
                  <p className="font-medium">{selectedBot.owner_email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">
                    {selectedBot.created_at ? new Date(selectedBot.created_at).toLocaleString() : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Visibility</p>
                  <p className="font-medium">{selectedBot.is_public ? 'Public' : 'Private'}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 py-4 border-t border-b">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedBot.stats?.documents_count || 0}</p>
                  <p className="text-sm text-gray-500">Documents</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedBot.stats?.messages_count || 0}</p>
                  <p className="text-sm text-gray-500">Messages</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedBot.stats?.conversations_count || 0}</p>
                  <p className="text-sm text-gray-500">Conversations</p>
                </div>
              </div>

              {/* System Prompt */}
              {selectedBot.system_prompt && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">System Prompt</p>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedBot.system_prompt}
                  </div>
                </div>
              )}

              {/* Documents */}
              {selectedBot.documents && selectedBot.documents.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Documents ({selectedBot.documents.length})</p>
                  <div className="space-y-2">
                    {selectedBot.documents.slice(0, 10).map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 truncate flex-1">{doc.filename}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          doc.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                    ))}
                    {selectedBot.documents.length > 10 && (
                      <p className="text-sm text-gray-500 text-center">
                        + {selectedBot.documents.length - 10} more documents
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setSelectedBot(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleDelete(selectedBot.id);
                  setSelectedBot(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Chatbot
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminChatbots;
