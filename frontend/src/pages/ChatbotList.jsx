import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { chatbots } from '../utils/api';
import { MessageSquare, Plus, Trash2, Settings } from 'lucide-react';

const ChatbotList = () => {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChatbots();
  }, []);

  const loadChatbots = async () => {
    try {
      const response = await chatbots.list();
      setBots(response.data);
    } catch (error) {
      console.error('Failed to load chatbots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await chatbots.delete(id);
      setBots(bots.filter((bot) => bot.id !== id));
    } catch (error) {
      console.error('Failed to delete chatbot:', error);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Chatbots</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Manage your AI chatbots</p>
          </div>
          <Link
            to="/chatbots/new"
            className="flex items-center justify-center px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] text-sm sm:text-base"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Chatbot
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 text-center text-sm sm:text-base text-gray-500">
            Loading...
          </div>
        ) : bots.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center">
            <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">No chatbots yet</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-6">
              Create your first AI chatbot to embed on your website
            </p>
            <Link
              to="/chatbots/new"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px] text-sm sm:text-base"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Chatbot
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {bots.map((bot) => (
              <div key={bot.id} className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 sm:p-6 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: bot.primary_color || '#3B82F6' }}
                      >
                        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                        <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{bot.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {bot.document_count || 0} documents
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 line-clamp-2">
                    {bot.welcome_message || 'Hello! How can I help you today?'}
                  </p>

                  <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm text-gray-500">
                    <span>{bot.total_messages || 0} messages</span>
                  </div>
                </div>

                <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t flex justify-between items-center gap-2 min-h-[56px]">
                  <Link
                    to={`/chatbots/${bot.id}`}
                    className="flex items-center text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm min-h-[44px]"
                  >
                    <Settings className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">Configure</span>
                  </Link>
                  <button
                    onClick={() => handleDelete(bot.id, bot.name)}
                    className="flex items-center text-red-500 hover:text-red-600 text-xs sm:text-sm min-h-[44px]"
                  >
                    <Trash2 className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ChatbotList;
