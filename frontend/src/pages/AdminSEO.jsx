import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { seo } from '../utils/api';
import MetaTagEditor from '../components/seo/MetaTagEditor';
import KeywordModal from '../components/seo/KeywordModal';
import AuditResults from '../components/seo/AuditResults';
import {
  Search,
  FileText,
  Tag,
  ClipboardCheck,
  Globe,
  RefreshCw,
  Loader2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Save,
  Eye,
} from 'lucide-react';

const AdminSEO = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('meta');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Meta Tags State
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [showMetaEditor, setShowMetaEditor] = useState(false);

  // Keywords State
  const [keywords, setKeywords] = useState([]);
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState(null);

  // Audit State
  const [auditResult, setAuditResult] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  const [runningAudit, setRunningAudit] = useState(false);

  // Sitemap & Robots State
  const [sitemapEntries, setSitemapEntries] = useState([]);
  const [robotsConfig, setRobotsConfig] = useState(null);
  const [robotsPreview, setRobotsPreview] = useState('');
  const [generatingFiles, setGeneratingFiles] = useState(false);
  const [savingSitemap, setSavingSitemap] = useState(false);
  const [savingRobots, setSavingRobots] = useState(false);

  useEffect(() => {
    // Check access - allow marketing or admin roles
    const userRole = user?.role || 'user';
    const hasAccess = userRole === 'marketing' || userRole === 'admin' || user?.is_admin;

    if (user && !hasAccess) {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [pagesRes, keywordsRes, sitemapRes, robotsRes] = await Promise.all([
        seo.listPages(),
        seo.listKeywords(),
        seo.getSitemap(),
        seo.getRobots(),
      ]);
      setPages(pagesRes.data.pages || []);
      setKeywords(keywordsRes.data.keywords || []);
      setSitemapEntries(sitemapRes.data.entries || []);
      setRobotsConfig(robotsRes.data.config || null);
      setRobotsPreview(robotsRes.data.preview || '');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load SEO data');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async () => {
    try {
      setRunningAudit(true);
      const res = await seo.runAudit();
      setAuditResult(res.data);
      // Also refresh history
      const historyRes = await seo.getAuditHistory();
      setAuditHistory(historyRes.data.audits || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to run SEO audit');
    } finally {
      setRunningAudit(false);
    }
  };

  const handleSaveMetaTags = async (pageId, data) => {
    try {
      await seo.updatePage(pageId, data);
      await loadData();
      setShowMetaEditor(false);
      setSelectedPage(null);
    } catch (err) {
      throw err;
    }
  };

  const handleSaveKeyword = async (data) => {
    try {
      if (editingKeyword) {
        await seo.updateKeyword(editingKeyword.id, data);
      } else {
        await seo.createKeyword(data);
      }
      await loadData();
      setShowKeywordModal(false);
      setEditingKeyword(null);
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteKeyword = async (keywordId) => {
    if (!confirm('Are you sure you want to delete this keyword?')) return;
    try {
      await seo.deleteKeyword(keywordId);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete keyword');
    }
  };

  const handleSaveSitemap = async () => {
    try {
      setSavingSitemap(true);
      await seo.updateSitemap(sitemapEntries);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save sitemap');
    } finally {
      setSavingSitemap(false);
    }
  };

  const handleSaveRobots = async () => {
    try {
      setSavingRobots(true);
      await seo.updateRobots(robotsConfig);
      const robotsRes = await seo.getRobots();
      setRobotsPreview(robotsRes.data.preview || '');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save robots config');
    } finally {
      setSavingRobots(false);
    }
  };

  const handleGenerateFiles = async () => {
    try {
      setGeneratingFiles(true);
      await seo.generateFiles();
      await loadData();
      alert('Files generated successfully!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate files');
    } finally {
      setGeneratingFiles(false);
    }
  };

  const tabs = [
    { id: 'meta', label: 'Meta Tags', icon: FileText },
    { id: 'keywords', label: 'Keywords', icon: Tag },
    { id: 'audit', label: 'SEO Audit', icon: ClipboardCheck },
    { id: 'sitemap', label: 'Sitemap & Robots', icon: Globe },
  ];

  const getPriorityBadge = (priority) => {
    const styles = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[priority] || styles.medium}`}>
        {priority}
      </span>
    );
  };

  if (loading) {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Search className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SEO Tools</h1>
              <p className="text-sm text-gray-500">Optimize your public pages for search engines</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'meta' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Page Meta Tags</h2>
              <p className="text-sm text-gray-500">Click on a page to edit its SEO settings</p>
            </div>
            <div className="space-y-4">
              {pages.map((page) => (
                <div
                  key={page.page_id}
                  onClick={() => {
                    setSelectedPage(page);
                    setShowMetaEditor(true);
                  }}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{page.page_name}</h3>
                        <span className="text-xs text-gray-400">{page.url}</span>
                      </div>
                      <p className="text-sm text-blue-600 mt-1 truncate">{page.title}</p>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{page.description}</p>
                      {page.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {page.keywords.slice(0, 5).map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {kw}
                            </span>
                          ))}
                          {page.keywords.length > 5 && (
                            <span className="text-xs text-gray-400">+{page.keywords.length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <Edit2 className="w-4 h-4 text-gray-400 flex-shrink-0 ml-4" />
                  </div>
                  {/* SERP Preview */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">Google Preview:</p>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-blue-700 text-sm font-medium truncate">{page.title}</p>
                      <p className="text-green-700 text-xs truncate">{page.canonical_url || `https://aidenlink.cloud${page.url}`}</p>
                      <p className="text-gray-600 text-xs mt-1 line-clamp-2">{page.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'keywords' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Tracked Keywords</h2>
              <button
                onClick={() => {
                  setEditingKeyword(null);
                  setShowKeywordModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Keyword
              </button>
            </div>
            {keywords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No keywords tracked yet</p>
                <p className="text-sm mt-1">Add keywords to track for SEO optimization</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Keyword</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Target Pages</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Priority</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Notes</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((kw) => (
                      <tr key={kw.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900">{kw.keyword}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {kw.target_pages?.map((p, i) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">{getPriorityBadge(kw.priority)}</td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-500 line-clamp-1">{kw.notes || '-'}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingKeyword(kw);
                                setShowKeywordModal(true);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteKeyword(kw.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
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
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">SEO Audit</h2>
                  <p className="text-sm text-gray-500">Run an audit to check your SEO configuration</p>
                </div>
                <button
                  onClick={handleRunAudit}
                  disabled={runningAudit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {runningAudit ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ClipboardCheck className="w-4 h-4" />
                  )}
                  {runningAudit ? 'Running...' : 'Run Audit'}
                </button>
              </div>
              {auditResult ? (
                <AuditResults result={auditResult} />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No audit results yet</p>
                  <p className="text-sm mt-1">Click "Run Audit" to analyze your SEO configuration</p>
                </div>
              )}
            </div>

            {auditHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit History</h3>
                <div className="space-y-2">
                  {auditHistory.slice(0, 5).map((audit) => (
                    <div
                      key={audit.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            audit.overall_score >= 80
                              ? 'bg-green-100 text-green-700'
                              : audit.overall_score >= 60
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {audit.overall_score}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Score: {audit.overall_score}/100
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(audit.audit_date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" /> {audit.summary?.pass || 0}
                        </span>
                        <span className="flex items-center gap-1 text-yellow-600">
                          <AlertTriangle className="w-3 h-3" /> {audit.summary?.warning || 0}
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-3 h-3" /> {audit.summary?.fail || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sitemap' && (
          <div className="space-y-6">
            {/* Sitemap Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Sitemap Configuration</h2>
                  <p className="text-sm text-gray-500">Manage URLs in your sitemap.xml</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSitemapEntries([
                        ...sitemapEntries,
                        { url: 'https://aidenlink.cloud/', changefreq: 'weekly', priority: 0.5 },
                      ]);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    <Plus className="w-4 h-4" />
                    Add URL
                  </button>
                  <button
                    onClick={handleSaveSitemap}
                    disabled={savingSitemap}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingSitemap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {sitemapEntries.map((entry, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="text"
                      value={entry.url}
                      onChange={(e) => {
                        const updated = [...sitemapEntries];
                        updated[index].url = e.target.value;
                        setSitemapEntries(updated);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="https://aidenlink.cloud/page"
                    />
                    <select
                      value={entry.changefreq}
                      onChange={(e) => {
                        const updated = [...sitemapEntries];
                        updated[index].changefreq = e.target.value;
                        setSitemapEntries(updated);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="always">Always</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="never">Never</option>
                    </select>
                    <input
                      type="number"
                      value={entry.priority}
                      onChange={(e) => {
                        const updated = [...sitemapEntries];
                        updated[index].priority = parseFloat(e.target.value) || 0.5;
                        setSitemapEntries(updated);
                      }}
                      min="0"
                      max="1"
                      step="0.1"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => {
                        setSitemapEntries(sitemapEntries.filter((_, i) => i !== index));
                      }}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Robots.txt Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Robots.txt Configuration</h2>
                  <p className="text-sm text-gray-500">Control what search engines can crawl</p>
                </div>
                <button
                  onClick={handleSaveRobots}
                  disabled={savingRobots}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingRobots ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
              {robotsConfig && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
                      <input
                        type="text"
                        value={robotsConfig.user_agent}
                        onChange={(e) =>
                          setRobotsConfig({ ...robotsConfig, user_agent: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Allow Paths (one per line)
                      </label>
                      <textarea
                        value={robotsConfig.allow?.join('\n') || ''}
                        onChange={(e) =>
                          setRobotsConfig({
                            ...robotsConfig,
                            allow: e.target.value.split('\n').filter((p) => p.trim()),
                          })
                        }
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                        placeholder="/
/privacy"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Disallow Paths (one per line)
                      </label>
                      <textarea
                        value={robotsConfig.disallow?.join('\n') || ''}
                        onChange={(e) =>
                          setRobotsConfig({
                            ...robotsConfig,
                            disallow: e.target.value.split('\n').filter((p) => p.trim()),
                          })
                        }
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                        placeholder="/dashboard
/admin
/api"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sitemap URL</label>
                      <input
                        type="text"
                        value={robotsConfig.sitemap_url}
                        onChange={(e) =>
                          setRobotsConfig({ ...robotsConfig, sitemap_url: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="https://aidenlink.cloud/sitemap.xml"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preview</label>
                    <pre className="w-full h-64 p-4 bg-gray-900 text-green-400 rounded-lg text-sm font-mono overflow-auto">
                      {robotsPreview || 'Save to see preview'}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Generate Files */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Generate Files</h2>
                  <p className="text-sm text-gray-500">
                    Regenerate sitemap.xml and robots.txt files from your configuration
                  </p>
                </div>
                <button
                  onClick={handleGenerateFiles}
                  disabled={generatingFiles}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {generatingFiles ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {generatingFiles ? 'Generating...' : 'Generate Files'}
                </button>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  View sitemap.xml
                </a>
                <a
                  href="/robots.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  View robots.txt
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Meta Tag Editor Modal */}
      {showMetaEditor && selectedPage && (
        <MetaTagEditor
          page={selectedPage}
          onSave={handleSaveMetaTags}
          onClose={() => {
            setShowMetaEditor(false);
            setSelectedPage(null);
          }}
        />
      )}

      {/* Keyword Modal */}
      {showKeywordModal && (
        <KeywordModal
          keyword={editingKeyword}
          pages={pages}
          onSave={handleSaveKeyword}
          onClose={() => {
            setShowKeywordModal(false);
            setEditingKeyword(null);
          }}
        />
      )}
    </Layout>
  );
};

export default AdminSEO;
