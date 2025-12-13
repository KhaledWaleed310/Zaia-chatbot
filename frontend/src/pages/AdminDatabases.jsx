import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { admin } from '../utils/api';
import {
  Database,
  RefreshCw,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  HardDrive,
  Server,
  Activity,
} from 'lucide-react';

const AdminDatabases = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);

  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/dashboard');
      return;
    }
    loadDatabases();
  }, [user, navigate]);

  const loadDatabases = async () => {
    try {
      setLoading(true);
      const res = await admin.getDatabaseStats();
      setDatabases(res.data.databases || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load database status');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('This will remove all orphaned data (documents without chatbots, etc.). Continue?')) return;
    try {
      setCleanupLoading(true);
      const res = await admin.cleanupOrphanedData();
      setCleanupResult(res.data.results);
      loadDatabases();
    } catch (err) {
      alert(err.response?.data?.detail || 'Cleanup failed');
    } finally {
      setCleanupLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'connected') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getDatabaseIcon = (name) => {
    if (name.includes('MongoDB')) return <Database className="w-6 h-6" />;
    if (name.includes('Qdrant')) return <HardDrive className="w-6 h-6" />;
    if (name.includes('Neo4j')) return <Activity className="w-6 h-6" />;
    if (name.includes('Redis')) return <Server className="w-6 h-6" />;
    return <Database className="w-6 h-6" />;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-7 h-7 text-green-600" />
              Database Management
            </h1>
            <p className="text-gray-500 mt-1">Monitor and maintain your databases</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadDatabases}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleCleanup}
              disabled={cleanupLoading}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {cleanupLoading ? 'Cleaning...' : 'Cleanup Orphaned Data'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Cleanup Result */}
        {cleanupResult && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <p className="font-medium mb-2">Cleanup completed:</p>
            <ul className="text-sm space-y-1">
              <li>Orphaned documents removed: {cleanupResult.orphaned_documents}</li>
              <li>Orphaned chunks removed: {cleanupResult.orphaned_chunks}</li>
              <li>Orphaned messages removed: {cleanupResult.orphaned_messages}</li>
              <li>Orphaned conversations removed: {cleanupResult.orphaned_conversations}</li>
            </ul>
          </div>
        )}

        {/* Database Cards */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {databases.map((db, index) => (
              <div
                key={index}
                className={`bg-white rounded-xl shadow-sm p-6 border-2 ${
                  db.status === 'connected' ? 'border-green-200' : 'border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      db.status === 'connected' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {getDatabaseIcon(db.name)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{db.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(db.status)}
                        <span className={`text-sm ${
                          db.status === 'connected' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {db.status === 'connected' ? 'Connected' : 'Error'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collections / Details */}
                {db.collections && db.collections.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Collections:</p>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="pb-2">Name</th>
                            <th className="pb-2 text-right">Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {db.collections.map((coll, idx) => (
                            <tr key={idx}>
                              <td className="py-2 text-gray-700">{coll.name}</td>
                              <td className="py-2 text-right text-gray-600">
                                {coll.documents?.toLocaleString() ||
                                 coll.vectors_count?.toLocaleString() ||
                                 coll.points_count?.toLocaleString() || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Details */}
                {db.details && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {db.details.total_keys !== undefined && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Total Keys</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {db.details.total_keys.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {db.details.used_memory && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Memory Used</p>
                        <p className="text-lg font-semibold text-gray-900">{db.details.used_memory}</p>
                      </div>
                    )}
                    {db.details.connected_clients !== undefined && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Connected Clients</p>
                        <p className="text-lg font-semibold text-gray-900">{db.details.connected_clients}</p>
                      </div>
                    )}
                    {db.details.total_nodes !== undefined && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Total Nodes</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {db.details.total_nodes.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {db.details.database && (
                      <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                        <p className="text-xs text-gray-500">Database Name</p>
                        <p className="text-lg font-semibold text-gray-900">{db.details.database}</p>
                      </div>
                    )}
                    {db.details.error && (
                      <div className="bg-red-50 rounded-lg p-3 col-span-2">
                        <p className="text-xs text-red-500">Error</p>
                        <p className="text-sm text-red-700">{db.details.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Database Overview */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Database Architecture</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <Database className="w-8 h-8 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">MongoDB</h4>
              <p className="text-sm text-gray-500 mt-1">
                Primary data store for users, chatbots, documents, messages, and conversations.
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <HardDrive className="w-8 h-8 text-purple-600 mb-2" />
              <h4 className="font-medium text-gray-900">Qdrant</h4>
              <p className="text-sm text-gray-500 mt-1">
                Vector database for semantic search and document embeddings.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <Activity className="w-8 h-8 text-green-600 mb-2" />
              <h4 className="font-medium text-gray-900">Neo4j</h4>
              <p className="text-sm text-gray-500 mt-1">
                Graph database for entity relationships and knowledge graphs.
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <Server className="w-8 h-8 text-orange-600 mb-2" />
              <h4 className="font-medium text-gray-900">Redis</h4>
              <p className="text-sm text-gray-500 mt-1">
                In-memory cache for sessions, rate limiting, and fast data access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDatabases;
