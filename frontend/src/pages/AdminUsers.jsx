import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { admin } from '../utils/api';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Shield,
  UserX,
  UserCheck,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Eye,
} from 'lucide-react';

const AdminUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ role: '', status: '', subscription_tier: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/dashboard');
      return;
    }
    loadUsers();
  }, [user, navigate, filters, pagination.page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        per_page: 20,
        ...(search && { search }),
        ...(filters.role && { role: filters.role }),
        ...(filters.status && { status: filters.status }),
        ...(filters.subscription_tier && { subscription_tier: filters.subscription_tier }),
      };
      const res = await admin.listUsers(params);
      setUsers(res.data.items || []);
      setPagination({
        page: res.data.page,
        pages: res.data.pages,
        total: res.data.total,
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    loadUsers();
  };

  const handleSuspend = async (userId) => {
    if (!confirm('Are you sure you want to suspend this user?')) return;
    try {
      setActionLoading(true);
      await admin.suspendUser(userId);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to suspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspend = async (userId) => {
    try {
      setActionLoading(true);
      await admin.unsuspendUser(userId);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to unsuspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      setActionLoading(true);
      await admin.deleteUser(userId);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (userId, data) => {
    try {
      setActionLoading(true);
      await admin.updateUser(userId, data);
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUser = async (data) => {
    try {
      setActionLoading(true);
      await admin.createUser(data);
      setShowCreateModal(false);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-red-100 text-red-700',
      deleted: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
        {status || 'active'}
      </span>
    );
  };

  const getTierBadge = (tier) => {
    const styles = {
      free: 'bg-gray-100 text-gray-700',
      pro: 'bg-blue-100 text-blue-700',
      enterprise: 'bg-purple-100 text-purple-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[tier] || styles.free}`}>
        {tier || 'free'}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const styles = {
      user: 'bg-gray-100 text-gray-700',
      marketing: 'bg-purple-100 text-purple-700',
      admin: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role] || styles.user}`}>
        {role || 'user'}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-blue-600" />
              User Management
            </h1>
            <p className="text-gray-500 mt-1">{pagination.total} total users</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or company..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <select
              value={filters.subscription_tier}
              onChange={(e) => setFilters((f) => ({ ...f, subscription_tier: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Tiers</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
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

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Chatbots</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Documents</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {u.email?.[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 flex items-center gap-2">
                              {u.email}
                              {u.is_admin && (
                                <Shield className="w-4 h-4 text-blue-600" title="Admin" />
                              )}
                            </p>
                            {u.company_name && (
                              <p className="text-sm text-gray-500">{u.company_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                      <td className="px-6 py-4">{getStatusBadge(u.status)}</td>
                      <td className="px-6 py-4">{getTierBadge(u.subscription_tier)}</td>
                      <td className="px-6 py-4 text-center text-gray-600">{u.chatbots_count}</td>
                      <td className="px-6 py-4 text-center text-gray-600">{u.documents_count}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setShowEditModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {u.status === 'suspended' ? (
                            <button
                              onClick={() => handleUnsuspend(u.id)}
                              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                              title="Unsuspend"
                              disabled={actionLoading}
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspend(u.id)}
                              className="p-2 text-gray-400 hover:text-yellow-600 transition-colors"
                              title="Suspend"
                              disabled={actionLoading || u.is_admin}
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                            disabled={actionLoading || u.is_admin}
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

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
          loading={actionLoading}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSubmit={(data) => handleUpdateUser(selectedUser.id, data)}
          loading={actionLoading}
        />
      )}
    </Layout>
  );
};

// Create User Modal Component
const CreateUserModal = ({ onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    company_name: '',
    role: 'user',
    subscription_tier: 'free',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Create New User</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">User</option>
              <option value="marketing">Marketing</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subscription</label>
            <select
              value={formData.subscription_tier}
              onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit User Modal Component
const EditUserModal = ({ user, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    company_name: user.company_name || '',
    role: user.role || 'user',
    status: user.status || 'active',
    subscription_tier: user.subscription_tier || 'free',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Edit User</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">User</option>
              <option value="marketing">Marketing</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subscription</label>
            <select
              value={formData.subscription_tier}
              onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminUsers;
