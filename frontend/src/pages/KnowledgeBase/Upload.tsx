import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import { api } from '@/api/client';
import { KnowledgeBase, Document, PaginatedResponse } from '@/types';
import FileUploader from '@/components/FileUploader';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function KnowledgeBaseUpload() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: kb, isLoading: kbLoading } = useQuery<KnowledgeBase>({
    queryKey: ['knowledge-base', id],
    queryFn: async () => {
      const response = await api.knowledgeBases.get(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const { data: documents, isLoading: docsLoading } = useQuery<PaginatedResponse<Document>>({
    queryKey: ['documents', id],
    queryFn: async () => {
      const response = await api.documents.list(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      return api.documents.upload(id!, files);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => api.documents.delete(id!, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', id] });
    },
  });

  const handleUpload = async (files: File[]) => {
    await uploadMutation.mutateAsync(files);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      case 'processing':
        return <span className="badge badge-warning">Processing</span>;
      case 'pending':
        return <span className="badge badge-info">Pending</span>;
      case 'failed':
        return <span className="badge badge-error">Failed</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (kbLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  if (!kb) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Knowledge base not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/knowledge-bases"
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Knowledge Bases
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{kb.name}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {kb.description || 'No description'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {kb.document_count}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Documents</div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Upload Documents
        </h2>
        <FileUploader onUpload={handleUpload} />
      </div>

      {/* Documents List */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Documents ({documents?.items.length || 0})
        </h2>

        {docsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner w-8 h-8"></div>
          </div>
        ) : documents && documents.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Chunks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {documents.items.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {doc.filename}
                      </div>
                      {doc.error_message && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {doc.error_message}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400 uppercase">
                        {doc.file_type}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(doc.file_size)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {doc.chunk_count || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this document?')) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        title="Delete document"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No documents uploaded yet. Upload your first document above.
            </p>
          </div>
        )}
      </div>

      {/* Knowledge Base Info */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Configuration
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Embedding Model
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {kb.embedding_model}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Chunk Size
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {kb.chunk_size} characters
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Chunk Overlap
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {kb.chunk_overlap} characters
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
            <dd className="mt-1">{getStatusBadge(kb.status)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
