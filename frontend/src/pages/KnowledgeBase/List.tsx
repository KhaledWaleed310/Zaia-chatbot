import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  TrashIcon,
  PencilIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/api/client';
import { KnowledgeBase, PaginatedResponse } from '@/types';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function KnowledgeBaseList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKBName, setNewKBName] = useState('');
  const [newKBDescription, setNewKBDescription] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<PaginatedResponse<KnowledgeBase>>({
    queryKey: ['knowledge-bases'],
    queryFn: async () => {
      const response = await api.knowledgeBases.list();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.knowledgeBases.create({
        name: newKBName,
        description: newKBDescription,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] });
      setShowCreateModal(false);
      setNewKBName('');
      setNewKBDescription('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.knowledgeBases.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] });
    },
  });

  const filteredKBs = data?.items.filter(
    (kb) =>
      kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kb.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    if (newKBName.trim()) {
      createMutation.mutate();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <span className="badge badge-success">Ready</span>;
      case 'processing':
        return <span className="badge badge-warning">Processing</span>;
      case 'failed':
        return <span className="badge badge-error">Failed</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
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
        <p className="text-red-600 dark:text-red-400">Error loading knowledge bases</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Knowledge Bases
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your document collections and knowledge bases
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary inline-flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Knowledge Base
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search knowledge bases..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Knowledge Bases Grid */}
      {filteredKBs && filteredKBs.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredKBs.map((kb) => (
            <div key={kb.id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {kb.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {kb.description || 'No description'}
                  </p>
                </div>
                {getStatusBadge(kb.status)}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  <span>{kb.document_count} documents</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Created {format(new Date(kb.created_at), 'MMM d, yyyy')}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <Link
                  to={`/knowledge-bases/${kb.id}/upload`}
                  className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 inline-flex items-center"
                >
                  <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
                  Upload
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this knowledge base?')) {
                        deleteMutation.mutate(kb.id);
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
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No knowledge bases
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating a new knowledge base
          </p>
          <div className="mt-6">
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Knowledge Base
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Create Knowledge Base
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={newKBName}
                  onChange={(e) => setNewKBName(e.target.value)}
                  className="input"
                  placeholder="e.g., Product Documentation"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <textarea
                  value={newKBDescription}
                  onChange={(e) => setNewKBDescription(e.target.value)}
                  className="textarea"
                  rows={3}
                  placeholder="Describe what this knowledge base contains..."
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCreate}
                disabled={!newKBName.trim() || createMutation.isPending}
                className="btn btn-primary flex-1"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewKBName('');
                  setNewKBDescription('');
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
