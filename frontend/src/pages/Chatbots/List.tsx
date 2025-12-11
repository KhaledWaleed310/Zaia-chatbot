import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CodeBracketIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/api/client';
import { Chatbot, PaginatedResponse } from '@/types';
import { format } from 'date-fns';
import clsx from 'clsx';
import ChatPreview from '@/components/ChatPreview';
import EmbedCodeModal from '@/components/EmbedCodeModal';

export default function ChatbotsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewChatbot, setPreviewChatbot] = useState<Chatbot | null>(null);
  const [embedChatbot, setEmbedChatbot] = useState<Chatbot | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<PaginatedResponse<Chatbot>>({
    queryKey: ['chatbots'],
    queryFn: async () => {
      const response = await api.chatbots.list();
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.chatbots.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      api.chatbots.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
    },
  });

  const filteredChatbots = data?.items.filter(
    (chatbot) =>
      chatbot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chatbot.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <span className="badge badge-success">Active</span>
    ) : (
      <span className="badge badge-error">Inactive</span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Error loading chatbots</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chatbots</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and deploy your AI chatbots
          </p>
        </div>
        <Link to="/chatbots/new" className="btn btn-primary inline-flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Chatbot
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search chatbots..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Chatbots Grid */}
      {filteredChatbots && filteredChatbots.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredChatbots.map((chatbot) => (
            <div key={chatbot.id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {chatbot.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {chatbot.description || 'No description'}
                  </p>
                </div>
                {getStatusBadge(chatbot.status)}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Knowledge Base:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {chatbot.knowledge_base_name || chatbot.knowledge_base_id}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Model:</span>
                  <span className="text-gray-900 dark:text-white">{chatbot.model_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {chatbot.total_conversations}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Conversations
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {chatbot.total_messages}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Messages</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 pt-2">
                  Created {format(new Date(chatbot.created_at), 'MMM d, yyyy')}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewChatbot(chatbot)}
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 inline-flex items-center"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    Preview
                  </button>
                  <button
                    onClick={() => setEmbedChatbot(chatbot)}
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 inline-flex items-center"
                  >
                    <CodeBracketIcon className="h-4 w-4 mr-1" />
                    Embed
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chatbot.status === 'active'}
                      onChange={() =>
                        toggleStatusMutation.mutate({
                          id: chatbot.id,
                          status: chatbot.status === 'active' ? 'inactive' : 'active',
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                  <Link
                    to={`/chatbots/${chatbot.id}/edit`}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this chatbot?')) {
                        deleteMutation.mutate(chatbot.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 card">
          <CodeBracketIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No chatbots
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating a new chatbot
          </p>
          <div className="mt-6">
            <Link to="/chatbots/new" className="btn btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Chatbot
            </Link>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewChatbot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full">
            <ChatPreview
              chatbotId={previewChatbot.id}
              chatbotName={previewChatbot.name}
              onClose={() => setPreviewChatbot(null)}
              className="w-full h-[600px]"
            />
          </div>
        </div>
      )}

      {/* Embed Code Modal */}
      {embedChatbot && (
        <EmbedCodeModal
          isOpen={true}
          onClose={() => setEmbedChatbot(null)}
          chatbotId={embedChatbot.id}
          chatbotName={embedChatbot.name}
        />
      )}
    </div>
  );
}
