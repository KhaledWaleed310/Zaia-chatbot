import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { leads, chatbots } from '../utils/api';
import { useLanguage } from '@/context/LanguageContext';
import {
  ArrowLeft,
  Users,
  Mail,
  Phone,
  Building,
  Calendar,
  Search,
  Filter,
  Download,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronDown,
  MessageSquare,
  TrendingUp,
  UserPlus,
  Target,
  Loader2
} from 'lucide-react';

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700'
};

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'converted', 'lost'];

const ChatbotLeads = () => {
  const { t } = useTranslation('dashboard');
  const { isRtl } = useLanguage();
  const { id } = useParams();
  const [bot, setBot] = useState(null);
  const [leadsData, setLeadsData] = useState({ items: [], total: 0, pages: 0 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFormConfig, setShowFormConfig] = useState(false);
  const [formConfig, setFormConfig] = useState(null);

  useEffect(() => {
    loadData();
  }, [id, page, statusFilter, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [botRes, leadsRes, statsRes, formRes] = await Promise.all([
        chatbots.get(id),
        leads.list(id, {
          page,
          per_page: 20,
          status: statusFilter || undefined,
          search: searchQuery || undefined
        }),
        leads.getStats(id),
        leads.getFormConfig(id)
      ]);

      setBot(botRes.data);
      setLeadsData(leadsRes.data);
      setStats(statsRes.data);
      setFormConfig(formRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await leads.export(id, format, statusFilter);
      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_${id}.${format}`;
      a.click();
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await leads.update(id, leadId, { status: newStatus });
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!confirm(t('leads.confirmDelete'))) return;
    try {
      await leads.delete(id, leadId);
      loadData();
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  const handleSaveFormConfig = async () => {
    try {
      await leads.updateFormConfig(id, formConfig);
      setShowFormConfig(false);
    } catch (error) {
      console.error('Failed to save form config:', error);
    }
  };

  if (loading && !bot) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/chatbots/${id}`}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {bot?.name} - {t('leads.title')}
              </h1>
              <p className="text-gray-500">{t('leads.subtitle')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFormConfig(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              {t('leads.formSettings')}
            </button>
            <div className="relative group">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" />
                {t('leads.export')}
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-1 w-32 bg-white border rounded-lg shadow-lg hidden group-hover:block z-10`}>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-2 text-start text-sm hover:bg-gray-50"
                >
                  {t('leads.exportCsv')}
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full px-4 py-2 text-start text-sm hover:bg-gray-50"
                >
                  {t('leads.exportJson')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('leads.stats.total')}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_leads}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('leads.stats.newThisMonth')}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.new_leads}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <UserPlus className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('leads.stats.conversionRate')}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.conversion_rate}%</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('leads.stats.qualified')}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.by_status?.qualified || 0}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
              <input
                type="text"
                placeholder={t('leads.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border rounded-lg`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white"
            >
              <option value="">{t('leads.allStatus')}</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {t(`leads.status.${status}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : leadsData.items.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t('leads.noLeads')}</p>
              <p className="text-sm text-gray-400 mt-1">
                {t('leads.enableLeadCapture')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-start px-4 py-3 text-sm font-medium text-gray-500">
                      {t('leads.table.contact')}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-gray-500">
                      {t('leads.table.company')}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-gray-500">
                      {t('leads.table.status')}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-gray-500">
                      {t('leads.table.source')}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-gray-500">
                      {t('leads.table.created')}
                    </th>
                    <th className="text-end px-4 py-3 text-sm font-medium text-gray-500">
                      {t('leads.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leadsData.items.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {lead.name || 'Unknown'}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {lead.email}
                              </span>
                            )}
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {lead.company && (
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <Building className="w-4 h-4" />
                            {lead.company}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status]} border-0 cursor-pointer`}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {t(`leads.status.${status}`)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {lead.source}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {lead.session_id && (
                            <button
                              onClick={() => setSelectedLead(lead)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title={t('leads.modal.viewConversation')}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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
          {leadsData.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                {t('leads.pagination.showing')} {page} {t('leads.pagination.of')} {leadsData.pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('leads.pagination.previous')}
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === leadsData.pages}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('leads.pagination.next')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lead Detail Modal */}
        {selectedLead && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('leads.modal.title')}</h3>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">{t('leads.modal.name')}</label>
                    <p className="font-medium">{selectedLead.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">{t('leads.modal.email')}</label>
                    <p className="font-medium">{selectedLead.email || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">{t('leads.modal.phone')}</label>
                    <p className="font-medium">{selectedLead.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">{t('leads.modal.company')}</label>
                    <p className="font-medium">{selectedLead.company || '-'}</p>
                  </div>
                </div>
                {selectedLead.conversation_summary && (
                  <div>
                    <label className="text-sm text-gray-500">{t('leads.modal.conversationSummary')}</label>
                    <p className="mt-1 p-3 bg-gray-50 rounded text-sm">
                      {selectedLead.conversation_summary}
                    </p>
                  </div>
                )}
                {Object.keys(selectedLead.custom_fields || {}).length > 0 && (
                  <div>
                    <label className="text-sm text-gray-500">{t('leads.modal.customFields')}</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded">
                      {Object.entries(selectedLead.custom_fields).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm py-1">
                          <span className="text-gray-500">{key}</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form Config Modal */}
        {showFormConfig && formConfig && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-auto">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('leads.formConfig.title')}</h3>
                <button
                  onClick={() => setShowFormConfig(false)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{t('leads.formConfig.enableForm')}</p>
                    <p className="text-sm text-gray-500">{t('leads.formConfig.enableFormDesc')}</p>
                  </div>
                  <button
                    onClick={() => setFormConfig({ ...formConfig, enabled: !formConfig.enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formConfig.enabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('leads.formConfig.formTitle')}
                  </label>
                  <input
                    type="text"
                    value={formConfig.title}
                    onChange={(e) => setFormConfig({ ...formConfig, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('leads.formConfig.description')}
                  </label>
                  <textarea
                    value={formConfig.description || ''}
                    onChange={(e) => setFormConfig({ ...formConfig, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('leads.formConfig.showForm')}
                  </label>
                  <select
                    value={formConfig.trigger}
                    onChange={(e) => setFormConfig({ ...formConfig, trigger: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="manual">{t('leads.formConfig.triggers.manual')}</option>
                    <option value="after_messages">{t('leads.formConfig.triggers.afterMessages')}</option>
                    <option value="on_exit">{t('leads.formConfig.triggers.onExit')}</option>
                  </select>
                </div>

                {formConfig.trigger === 'after_messages' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('leads.formConfig.afterHowMany')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formConfig.trigger_after_messages}
                      onChange={(e) => setFormConfig({
                        ...formConfig,
                        trigger_after_messages: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('leads.formConfig.successMessage')}
                  </label>
                  <input
                    type="text"
                    value={formConfig.success_message}
                    onChange={(e) => setFormConfig({ ...formConfig, success_message: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="pt-4 border-t">
                  <button
                    onClick={handleSaveFormConfig}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('leads.formConfig.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ChatbotLeads;
