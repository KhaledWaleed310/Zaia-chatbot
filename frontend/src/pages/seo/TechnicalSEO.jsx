import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Globe,
  Zap,
  Shield,
  Link2,
  Code,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Smartphone,
  Monitor,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { seo as api } from '../../utils/api';
import SEOScoreCircle from '../../components/seo/common/SEOScoreCircle';

export default function TechnicalSEO() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('audit');
  const [auditResult, setAuditResult] = useState(null);
  const [pageSpeedResult, setPageSpeedResult] = useState(null);
  const [sslResult, setSslResult] = useState(null);
  const [linksResult, setLinksResult] = useState(null);
  const [schemaResult, setSchemaResult] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [error, setError] = useState('');

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const runFullAudit = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');
    setAuditResult(null);

    try {
      const response = await api.runTechnicalAudit(url);
      setAuditResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to run technical audit');
    } finally {
      setLoading(false);
    }
  };

  const runPageSpeed = async (strategy = 'mobile') => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.analyzePageSpeed(url, strategy);
      setPageSpeedResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze page speed');
    } finally {
      setLoading(false);
    }
  };

  const checkSSL = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.checkSSL(url);
      setSslResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to check SSL');
    } finally {
      setLoading(false);
    }
  };

  const scanBrokenLinks = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.scanBrokenLinks(url);
      setLinksResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to scan links');
    } finally {
      setLoading(false);
    }
  };

  const validateSchema = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.validateSchema(url);
      setSchemaResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to validate schema');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good':
      case 'pass':
      case true:
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'needs_improvement':
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'poor':
      case 'fail':
      case false:
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const tabs = [
    { id: 'audit', label: 'Full Audit', icon: Search },
    { id: 'speed', label: 'Page Speed', icon: Zap },
    { id: 'ssl', label: 'SSL Check', icon: Shield },
    { id: 'links', label: 'Broken Links', icon: Link2 },
    { id: 'schema', label: 'Schema', icon: Code },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/seo')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Technical SEO</h1>
              <p className="text-sm text-gray-500">
                Analyze page speed, SSL, broken links, and structured data
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* URL Input */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL to Analyze
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border mb-6">
          <div className="border-b">
            <div className="flex overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Full Audit Tab */}
            {activeTab === 'audit' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <p className="text-gray-600">
                    Run a comprehensive technical SEO audit combining all checks.
                  </p>
                  <button
                    onClick={runFullAudit}
                    disabled={loading || !url}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Run Full Audit
                  </button>
                </div>

                {auditResult && (
                  <div className="space-y-6">
                    {/* Overall Score */}
                    <div className="flex items-center gap-8 p-6 bg-gray-50 rounded-xl">
                      <SEOScoreCircle score={auditResult.overall_score} size="lg" />
                      <div>
                        <h3 className="text-xl font-semibold">
                          Overall Score: {auditResult.grade}
                        </h3>
                        <p className="text-gray-600">
                          Audited at {new Date(auditResult.audited_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* PageSpeed Unavailable Notice */}
                    {auditResult.pagespeed_unavailable && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div>
                          <p className="text-blue-700 font-medium">PageSpeed data unavailable</p>
                          <p className="text-blue-600 text-sm">
                            Google PageSpeed API quota exceeded. Score is based on other metrics only. Try again tomorrow for performance data.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Categories */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(auditResult.categories || {}).map(([key, cat]) => (
                        <div key={key} className={`p-4 border rounded-lg ${
                          key === 'performance' && cat.available === false ? 'bg-gray-50 opacity-60' : ''
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium capitalize">{key.replace('_', ' ')}</span>
                            {key === 'performance' && cat.available === false ? (
                              <span className="text-sm text-gray-500">N/A</span>
                            ) : (
                              <span className={`text-lg font-bold ${getScoreColor(cat.score)}`}>
                                {cat.score}
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                key === 'performance' && cat.available === false ? 'bg-gray-400' :
                                cat.score >= 90 ? 'bg-green-500' :
                                cat.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: key === 'performance' && cat.available === false ? '0%' : `${cat.score}%` }}
                            />
                          </div>
                          {key === 'performance' && cat.available === false && (
                            <p className="text-xs text-gray-500 mt-2">API quota exceeded</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Critical Issues */}
                    {auditResult.critical_issues?.length > 0 && (
                      <div>
                        <button
                          onClick={() => toggleSection('critical')}
                          className="flex items-center justify-between w-full p-4 bg-red-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-500" />
                            <span className="font-medium text-red-700">
                              Critical Issues ({auditResult.critical_issues.length})
                            </span>
                          </div>
                          {expandedSections.critical ? (
                            <ChevronUp className="w-5 h-5 text-red-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-red-500" />
                          )}
                        </button>
                        {expandedSections.critical && (
                          <div className="mt-2 space-y-2">
                            {auditResult.critical_issues.map((issue, idx) => (
                              <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                                    {issue.category}
                                  </span>
                                  <span className="text-xs text-red-600">
                                    Impact: {issue.impact}
                                  </span>
                                </div>
                                <p className="mt-1 text-red-700">{issue.issue}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Warnings */}
                    {auditResult.warnings?.length > 0 && (
                      <div>
                        <button
                          onClick={() => toggleSection('warnings')}
                          className="flex items-center justify-between w-full p-4 bg-yellow-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            <span className="font-medium text-yellow-700">
                              Warnings ({auditResult.warnings.length})
                            </span>
                          </div>
                          {expandedSections.warnings ? (
                            <ChevronUp className="w-5 h-5 text-yellow-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-yellow-500" />
                          )}
                        </button>
                        {expandedSections.warnings && (
                          <div className="mt-2 space-y-2">
                            {auditResult.warnings.map((warning, idx) => (
                              <div key={idx} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                                    {warning.category}
                                  </span>
                                </div>
                                <p className="mt-1 text-yellow-700">{warning.issue}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Passed Checks */}
                    {auditResult.passed_checks?.length > 0 && (
                      <div>
                        <button
                          onClick={() => toggleSection('passed')}
                          className="flex items-center justify-between w-full p-4 bg-green-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <span className="font-medium text-green-700">
                              Passed Checks ({auditResult.passed_checks.length})
                            </span>
                          </div>
                          {expandedSections.passed ? (
                            <ChevronUp className="w-5 h-5 text-green-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-green-500" />
                          )}
                        </button>
                        {expandedSections.passed && (
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {auditResult.passed_checks.map((check, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-green-700">{check}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recommendations */}
                    {auditResult.recommendations?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Recommendations</h4>
                        <div className="space-y-3">
                          {auditResult.recommendations.map((rec, idx) => (
                            <div key={idx} className="p-4 border rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  rec.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                  rec.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                  rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {rec.priority}
                                </span>
                                <span className="text-xs text-gray-500">{rec.category}</span>
                              </div>
                              <h5 className="font-medium">{rec.title}</h5>
                              <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Page Speed Tab */}
            {activeTab === 'speed' && (
              <div>
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                  <p className="text-gray-600">
                    Analyze page performance using Google PageSpeed Insights.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => runPageSpeed('mobile')}
                      disabled={loading || !url}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Smartphone className="w-4 h-4" />
                      )}
                      Mobile
                    </button>
                    <button
                      onClick={() => runPageSpeed('desktop')}
                      disabled={loading || !url}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Monitor className="w-4 h-4" />
                      )}
                      Desktop
                    </button>
                  </div>
                </div>

                {pageSpeedResult && pageSpeedResult.success && (
                  <div className="space-y-6">
                    {/* Performance Score */}
                    <div className="flex items-center gap-8 p-6 bg-gray-50 rounded-xl">
                      <SEOScoreCircle score={pageSpeedResult.overall_score} size="lg" />
                      <div>
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                          {pageSpeedResult.strategy === 'mobile' ? (
                            <Smartphone className="w-5 h-5" />
                          ) : (
                            <Monitor className="w-5 h-5" />
                          )}
                          {pageSpeedResult.strategy.charAt(0).toUpperCase() + pageSpeedResult.strategy.slice(1)} Performance
                        </h3>
                        <p className="text-gray-600">{pageSpeedResult.url}</p>
                      </div>
                    </div>

                    {/* Core Web Vitals */}
                    {pageSpeedResult.core_web_vitals && (
                      <div>
                        <h4 className="font-medium mb-3">Core Web Vitals</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(pageSpeedResult.core_web_vitals).map(([key, vital]) => (
                            <div key={key} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-500 uppercase">{key}</span>
                                {getStatusIcon(vital.rating)}
                              </div>
                              <div className="text-2xl font-bold mb-1">
                                {vital.display_value}
                              </div>
                              <div className="text-xs text-gray-500">
                                {vital.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Scores */}
                    {pageSpeedResult.scores && Object.keys(pageSpeedResult.scores).length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Category Scores</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(pageSpeedResult.scores).map(([key, data]) => (
                            <div key={key} className="p-4 border rounded-lg text-center">
                              <div className={`text-3xl font-bold ${getScoreColor(data.score)}`}>
                                {data.score}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">{data.title}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Opportunities */}
                    {pageSpeedResult.opportunities?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Improvement Opportunities</h4>
                        <div className="space-y-3">
                          {pageSpeedResult.opportunities.map((opp, idx) => (
                            <div key={idx} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium">{opp.title}</h5>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  opp.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  opp.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {opp.savings_ms > 0 ? `Save ${(opp.savings_ms / 1000).toFixed(1)}s` : opp.priority}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{opp.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {pageSpeedResult && !pageSpeedResult.success && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                    {pageSpeedResult.error}: {pageSpeedResult.message}
                  </div>
                )}
              </div>
            )}

            {/* SSL Check Tab */}
            {activeTab === 'ssl' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <p className="text-gray-600">
                    Check SSL certificate validity and security status.
                  </p>
                  <button
                    onClick={checkSSL}
                    disabled={loading || !url}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4" />
                    )}
                    Check SSL
                  </button>
                </div>

                {sslResult && (
                  <div className="space-y-6">
                    <div className={`p-6 rounded-xl ${
                      sslResult.valid ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <div className="flex items-center gap-4">
                        {sslResult.valid ? (
                          <CheckCircle2 className="w-12 h-12 text-green-500" />
                        ) : (
                          <XCircle className="w-12 h-12 text-red-500" />
                        )}
                        <div>
                          <h3 className={`text-xl font-semibold ${
                            sslResult.valid ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {sslResult.valid ? 'SSL Certificate Valid' : 'SSL Certificate Invalid'}
                          </h3>
                          <p className="text-gray-600">{sslResult.url}</p>
                        </div>
                      </div>
                    </div>

                    {sslResult.has_ssl && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-gray-500 mb-1">Issuer</div>
                          <div className="font-medium">{sslResult.issuer || 'Unknown'}</div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-gray-500 mb-1">Subject</div>
                          <div className="font-medium">{sslResult.subject || 'Unknown'}</div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-gray-500 mb-1">Protocol</div>
                          <div className="font-medium">{sslResult.protocol || 'Unknown'}</div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-gray-500 mb-1">Expires</div>
                          <div className="font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {sslResult.expires ? new Date(sslResult.expires).toLocaleDateString() : 'Unknown'}
                            {sslResult.days_until_expiry !== null && (
                              <span className={`text-sm ${
                                sslResult.days_until_expiry < 30 ? 'text-red-600' : 'text-gray-500'
                              }`}>
                                ({sslResult.days_until_expiry} days)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {sslResult.errors?.length > 0 && (
                      <div className="space-y-2">
                        {sslResult.errors.map((err, idx) => (
                          <div key={idx} className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {err}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Broken Links Tab */}
            {activeTab === 'links' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <p className="text-gray-600">
                    Scan page for broken internal and external links.
                  </p>
                  <button
                    onClick={scanBrokenLinks}
                    disabled={loading || !url}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    Scan Links
                  </button>
                </div>

                {linksResult && (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {linksResult.summary?.total || 0}
                        </div>
                        <div className="text-sm text-blue-600">Total Links</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {linksResult.summary?.ok || 0}
                        </div>
                        <div className="text-sm text-green-600">Valid</div>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {linksResult.summary?.broken || 0}
                        </div>
                        <div className="text-sm text-red-600">Broken</div>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {linksResult.summary?.redirects || 0}
                        </div>
                        <div className="text-sm text-yellow-600">Redirects</div>
                      </div>
                    </div>

                    {/* Broken Links */}
                    {linksResult.broken_links?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 text-red-600">
                          Broken Links ({linksResult.broken_links.length})
                        </h4>
                        <div className="space-y-2">
                          {linksResult.broken_links.map((link, idx) => (
                            <div key={idx} className="p-3 border border-red-200 bg-red-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-red-700 hover:underline flex items-center gap-1 truncate max-w-lg"
                                >
                                  {link.url}
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                  {link.status_code || link.error}
                                </span>
                              </div>
                              {link.text && (
                                <div className="text-sm text-gray-600 mt-1">
                                  Link text: {link.text}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Redirects */}
                    {linksResult.redirects?.length > 0 && (
                      <div>
                        <button
                          onClick={() => toggleSection('redirects')}
                          className="flex items-center justify-between w-full p-4 bg-yellow-50 rounded-lg"
                        >
                          <span className="font-medium text-yellow-700">
                            Redirects ({linksResult.redirects.length})
                          </span>
                          {expandedSections.redirects ? (
                            <ChevronUp className="w-5 h-5 text-yellow-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-yellow-500" />
                          )}
                        </button>
                        {expandedSections.redirects && (
                          <div className="mt-2 space-y-2">
                            {linksResult.redirects.map((link, idx) => (
                              <div key={idx} className="p-3 border rounded-lg">
                                <div className="text-sm truncate">{link.url}</div>
                                {link.redirect_url && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    → {link.redirect_url}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Schema Tab */}
            {activeTab === 'schema' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <p className="text-gray-600">
                    Validate structured data (Schema.org) on the page.
                  </p>
                  <button
                    onClick={validateSchema}
                    disabled={loading || !url}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Code className="w-4 h-4" />
                    )}
                    Validate Schema
                  </button>
                </div>

                {schemaResult && (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="flex items-center gap-8 p-6 bg-gray-50 rounded-xl">
                      <SEOScoreCircle score={schemaResult.overall_score} size="lg" />
                      <div>
                        <h3 className="text-xl font-semibold">
                          {schemaResult.total_schemas} Schema(s) Found
                        </h3>
                        <p className="text-gray-600">
                          {schemaResult.valid_schemas} valid, {schemaResult.invalid_schemas} with issues
                        </p>
                        {schemaResult.schema_types?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {schemaResult.schema_types.map((type, idx) => (
                              <span key={idx} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                {type}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Issues */}
                    {schemaResult.issues?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 text-red-600">Issues</h4>
                        <div className="space-y-2">
                          {schemaResult.issues.map((issue, idx) => (
                            <div key={idx} className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                              <XCircle className="w-4 h-4 flex-shrink-0" />
                              {issue}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {schemaResult.recommendations?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Recommendations</h4>
                        <div className="space-y-2">
                          {schemaResult.recommendations.map((rec, idx) => (
                            <div key={idx} className="p-3 bg-blue-50 text-blue-700 rounded-lg flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                              {rec}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {schemaResult.total_schemas === 0 && (
                      <div className="p-6 bg-yellow-50 rounded-lg text-center">
                        <Code className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                        <h4 className="font-medium text-yellow-700">No Structured Data Found</h4>
                        <p className="text-sm text-yellow-600 mt-1">
                          Consider adding JSON-LD schema markup to improve search engine understanding.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
