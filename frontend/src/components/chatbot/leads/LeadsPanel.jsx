import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { leads } from '@/utils/api';
import { useLanguage } from '@/context/LanguageContext';
import {
  Users,
  Mail,
  Phone,
  Building,
  Calendar,
  Search,
  Download,
  Check,
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

const LeadsPanel = () => {
  const { t } = useTranslation('dashboard');
  const { isRtl } = useLanguage();
  const { bot } = useOutletContext();

  const [leadsData, setLeadsData] = useState({ items: [], total: 0, pages: 0 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (bot?.id) {
      loadData();
    }
  }, [bot?.id, page, statusFilter, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsRes, statsRes] = await Promise.all([
        leads.list(bot.id, {
          page,
          per_page: 20,
          status: statusFilter || undefined,
          search: searchQuery || undefined
        }),
        leads.getStats(bot.id)
      ]);

      setLeadsData(leadsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await leads.export(bot.id, format, statusFilter);
      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_${bot.id}.${format}`;
      a.click();
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await leads.update(bot.id, leadId, { status: newStatus });
      setLeadsData(prev => ({
        ...prev,
        items: prev.items.map(lead =>
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        )
      }));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (loading && !leadsData.items.length) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">{t('leads.stats.total')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <UserPlus className="w-4 h-4" />
              <span className="text-sm">{t('leads.stats.newThisMonth')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.this_week || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm">{t('leads.stats.qualified')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.qualified || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">{t('leads.status.converted')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.converted || 0}</p>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
          <input
            type="text"
            placeholder={t('leads.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border rounded-lg text-sm`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="">{t('leads.allStatus')}</option>
          {STATUS_OPTIONS.map(status => (
            <option key={status} value={status}>
              {t(`leads.status.${status}`)}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            {t('leads.exportCsv')}
          </button>
          <button
            onClick={() => handleExport('json')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            {t('leads.exportJson')}
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {leadsData.items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p>{t('leads.noLeads')}</p>
            <p className="text-sm mt-1">{t('leads.enableLeadCapture')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">{t('leads.table.contact')}</th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">{t('leads.table.company')}</th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">{t('leads.table.status')}</th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">{t('leads.table.created')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leadsData.items.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{lead.name || '-'}</p>
                        {lead.email && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {lead.email}
                          </p>
                        )}
                        {lead.phone && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {lead.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {lead.company && (
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Building className="w-3 h-3" /> {lead.company}
                        </p>
                      )}
                      {lead.message && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MessageSquare className="w-3 h-3" />
                          <span className="truncate max-w-[200px]">{lead.message}</span>
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[lead.status] || 'bg-gray-100'}`}
                      >
                        {STATUS_OPTIONS.map(status => (
                          <option key={status} value={status}>
                            {t(`leads.status.${status}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
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
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                {t('leads.pagination.previous')}
              </button>
              <button
                onClick={() => setPage(p => Math.min(leadsData.pages, p + 1))}
                disabled={page === leadsData.pages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                {t('leads.pagination.next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { LeadsPanel };
