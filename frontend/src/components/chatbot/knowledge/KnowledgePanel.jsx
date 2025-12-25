import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Upload,
  Trash2,
  FileText,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { chatbots } from '@/utils/api';

const PROVIDER_NAMES = {
  google_drive: 'Google Drive',
  gmail: 'Gmail',
  notion: 'Notion',
  slack: 'Slack',
  hubspot: 'HubSpot',
};

const KnowledgePanel = () => {
  const { bot } = useOutletContext();
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [bot?.id]);

  const loadDocuments = async () => {
    if (!bot?.id) return;
    try {
      const response = await chatbots.listDocuments(bot.id);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await chatbots.uploadDocument(bot.id, file);
      setDocuments((prev) => [...prev, response.data]);
      pollDocumentStatus(response.data.id);
    } catch (error) {
      console.error('Failed to upload:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const pollDocumentStatus = async (docId) => {
    const interval = setInterval(async () => {
      try {
        const response = await chatbots.listDocuments(bot.id);
        const doc = response.data.find((d) => d.id === docId);
        if (doc && doc.status !== 'processing') {
          setDocuments(response.data);
          clearInterval(interval);
        }
      } catch (error) {
        clearInterval(interval);
      }
    }, 3000);
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Delete this document?')) return;

    try {
      await chatbots.deleteDocument(bot.id, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Knowledge Base</h3>
            <p className="text-sm text-gray-500">Upload documents to train your chatbot</p>
          </div>
          <label className="flex items-center justify-center px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm whitespace-nowrap">
            <Upload className="w-5 h-5 mr-2 flex-shrink-0" />
            {uploading ? 'Uploading...' : 'Upload Document'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No documents uploaded yet</p>
            <p className="text-sm text-gray-400 mt-1">Supports PDF, DOCX, and TXT files</p>
          </div>
        ) : (
          <div className="divide-y">
            {documents.map((doc) => (
              <div key={doc.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center min-w-0 flex-1">
                  <FileText className="w-8 h-8 text-gray-400 flex-shrink-0" />
                  <div className="ml-4 min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{doc.filename}</p>
                    <p className="text-sm text-gray-500">
                      {doc.chunks_count || 0} chunks • {(doc.size / 1024).toFixed(1)} KB
                      {doc.source_type && doc.source_type !== 'upload' && (
                        <span className="ml-2 text-blue-600">
                          • {PROVIDER_NAMES[doc.source_type] || doc.source_type}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end space-x-4 pl-12 sm:pl-0">
                  {doc.status === 'processing' ? (
                    <span className="flex items-center text-yellow-600 text-sm">
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Processing
                    </span>
                  ) : doc.status === 'completed' ? (
                    <span className="flex items-center text-green-600 text-sm">
                      <Check className="w-4 h-4 mr-1" />
                      Ready
                    </span>
                  ) : (
                    <span className="flex items-center text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Failed
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { KnowledgePanel };
