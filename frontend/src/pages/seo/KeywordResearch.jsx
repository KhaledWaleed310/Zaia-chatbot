import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { seo } from '../../utils/api';
import SEOScoreCircle from '../../components/seo/common/SEOScoreCircle';
import {
  Search,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Download,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  MessageSquare,
  Sparkles,
  BarChart3,
  Filter,
  RefreshCw,
  Clock,
} from 'lucide-react';

const KeywordResearch = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seedKeyword, setSeedKeyword] = useState('');
  const [language, setLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState('research');

  // Research Results
  const [researchResult, setResearchResult] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [savedResearch, setSavedResearch] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Filters
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedClusters, setExpandedClusters] = useState({});

  useEffect(() => {
    const userRole = user?.role || 'user';
    const hasAccess = ['marketing', 'admin', 'super_admin'].includes(userRole) || user?.is_admin;

    if (user && !hasAccess) {
      navigate('/dashboard');
      return;
    }
    loadSavedResearch();
  }, [user, navigate]);

  const loadSavedResearch = async () => {
    try {
      setLoadingSaved(true);
      const res = await seo.getSavedKeywordResearch(20);
      setSavedResearch(res.data.items || []);
    } catch (err) {
      console.error('Failed to load saved research:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleResearch = async (e) => {
    e.preventDefault();
    if (!seedKeyword.trim()) return;

    try {
      setLoading(true);
      setError('');
      setResearchResult(null);
      setAnalysisResult(null);

      // Run both research and analysis in parallel
      const [researchRes, analysisRes] = await Promise.all([
        seo.researchKeywords(seedKeyword.trim(), language, 30),
        seo.analyzeKeyword(seedKeyword.trim()),
      ]);

      setResearchResult(researchRes.data);
      setAnalysisResult(analysisRes.data);
      setExpandedClusters({});
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to research keywords');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResearch = async () => {
    if (!seedKeyword.trim()) return;

    try {
      setLoading(true);
      await seo.saveKeywordResearch(seedKeyword.trim(), language, 30);
      await loadSavedResearch();
      setActiveTab('saved');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save research');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSaved = async (researchId) => {
    if (!confirm('Delete this saved research?')) return;

    try {
      await seo.deleteSavedKeywordResearch(researchId);
      await loadSavedResearch();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete research');
    }
  };

  const handleLoadSaved = (saved) => {
    setSeedKeyword(saved.seed_keyword);
    setResearchResult({
      seed_keyword: saved.seed_keyword,
      total_suggestions: saved.total_keywords,
      suggestions: saved.suggestions,
      clusters: saved.clusters,
    });
    setAnalysisResult(null);
    setActiveTab('research');
  };

  const toggleCluster = (clusterName) => {
    setExpandedClusters((prev) => ({
      ...prev,
      [clusterName]: !prev[clusterName],
    }));
  };

  const getDifficultyColor = (difficulty) => {
    if (difficulty >= 71) return 'text-red-600 bg-red-50';
    if (difficulty >= 41) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getCompetitionBadge = (competition) => {
    const colors = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700',
    };
    return colors[competition] || colors.medium;
  };

  const getVolumeIcon = (category) => {
    if (category === 'very_high' || category === 'high') {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    }
    if (category === 'very_low' || category === 'low') {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const filteredSuggestions = researchResult?.suggestions?.filter((kw) => {
    if (difficultyFilter !== 'all') {
      if (difficultyFilter === 'low' && kw.difficulty_score > 40) return false;
      if (difficultyFilter === 'medium' && (kw.difficulty_score <= 40 || kw.difficulty_score > 70)) return false;
      if (difficultyFilter === 'high' && kw.difficulty_score <= 70) return false;
    }
    if (typeFilter !== 'all' && kw.keyword_type !== typeFilter) return false;
    return true;
  }) || [];

  const tabs = [
    { id: 'research', label: 'Research', icon: Search },
    { id: 'saved', label: 'Saved', icon: Clock },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/admin/seo')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to SEO</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Keyword Research</h1>
              <p className="text-xs sm:text-sm text-gray-500">Discover and analyze keywords for your SEO strategy</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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

        {activeTab === 'research' && (
          <>
            {/* Search Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
              <form onSubmit={handleResearch} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seed Keyword
                  </label>
                  <input
                    type="text"
                    value={seedKeyword}
                    onChange={(e) => setSeedKeyword(e.target.value)}
                    placeholder="e.g., chatbot, customer support, AI"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
                <div className="sm:w-32">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
                <div className="sm:self-end flex gap-2">
                  <button
                    type="submit"
                    disabled={loading || !seedKeyword.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Research
                  </button>
                  {researchResult && (
                    <button
                      type="button"
                      onClick={handleSaveResearch}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Analysis Overview */}
            {analysisResult && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Keyword Analysis</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <SEOScoreCircle score={analysisResult.difficulty_score} size="md" />
                    <div>
                      <p className="text-xs text-gray-500">Difficulty</p>
                      <p className={`text-sm font-medium ${getDifficultyColor(analysisResult.difficulty_score).split(' ')[0]}`}>
                        {analysisResult.competition}
                      </p>
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-gray-500 mb-1">Est. Volume</p>
                    <div className="flex items-center justify-center sm:justify-start gap-1">
                      {getVolumeIcon(analysisResult.volume_category)}
                      <span className="text-lg font-semibold">{analysisResult.search_volume.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-400">{analysisResult.volume_category.replace('_', ' ')}</p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-gray-500 mb-1">Type</p>
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                      {analysisResult.keyword_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-gray-500 mb-1">Words</p>
                    <p className="text-lg font-semibold">{analysisResult.word_count}</p>
                    <p className="text-xs text-gray-400">{analysisResult.character_count} chars</p>
                  </div>
                </div>

                {/* Recommendations */}
                {analysisResult.recommendations?.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Recommendations
                    </h3>
                    <ul className="space-y-1">
                      {analysisResult.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* LSI Keywords */}
                {analysisResult.lsi_keywords?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Related Terms (LSI)</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.lsi_keywords.map((lsi, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm cursor-pointer hover:bg-purple-100 hover:text-purple-700"
                          onClick={() => setSeedKeyword(lsi)}
                        >
                          {lsi}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {researchResult && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Keyword Suggestions
                    </h2>
                    <p className="text-sm text-gray-500">
                      {filteredSuggestions.length} of {researchResult.total_suggestions} keywords
                    </p>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={difficultyFilter}
                      onChange={(e) => setDifficultyFilter(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All Difficulty</option>
                      <option value="low">Low (0-40)</option>
                      <option value="medium">Medium (41-70)</option>
                      <option value="high">High (71+)</option>
                    </select>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All Types</option>
                      <option value="short_tail">Short-tail</option>
                      <option value="long_tail">Long-tail</option>
                      <option value="question">Questions</option>
                    </select>
                  </div>
                </div>

                {/* Keyword Table - Desktop */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                          Keyword
                        </th>
                        <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                          Difficulty
                        </th>
                        <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                          Volume
                        </th>
                        <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                          Competition
                        </th>
                        <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                          Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredSuggestions.map((kw, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span
                              className="text-gray-900 hover:text-purple-600 cursor-pointer"
                              onClick={() => setSeedKeyword(kw.keyword)}
                            >
                              {kw.keyword}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${getDifficultyColor(kw.difficulty_score)}`}>
                              {kw.difficulty_score}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {getVolumeIcon(kw.volume_category)}
                              <span className="text-gray-900">{kw.search_volume.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getCompetitionBadge(kw.competition)}`}>
                              {kw.competition}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs text-gray-500">
                              {kw.keyword_type.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Keyword Cards - Mobile */}
                <div className="sm:hidden space-y-3">
                  {filteredSuggestions.map((kw, i) => (
                    <div
                      key={i}
                      className="p-4 border border-gray-200 rounded-lg"
                      onClick={() => setSeedKeyword(kw.keyword)}
                    >
                      <p className="font-medium text-gray-900 mb-2">{kw.keyword}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${getDifficultyColor(kw.difficulty_score)}`}>
                            {kw.difficulty_score}
                          </span>
                          <span className="text-gray-500">diff</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getVolumeIcon(kw.volume_category)}
                          <span className="text-gray-700">{kw.search_volume.toLocaleString()}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs ${getCompetitionBadge(kw.competition)}`}>
                          {kw.competition}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredSuggestions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No keywords match your filters</p>
                  </div>
                )}

                {/* Topic Clusters */}
                {researchResult.clusters && Object.keys(researchResult.clusters).length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Topic Clusters</h3>
                    <div className="space-y-3">
                      {Object.entries(researchResult.clusters).map(([clusterName, keywords]) => (
                        <div key={clusterName} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleCluster(clusterName)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 capitalize">
                                {clusterName.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {keywords.length} keywords
                              </span>
                            </div>
                            {expandedClusters[clusterName] ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                          {expandedClusters[clusterName] && (
                            <div className="px-4 pb-4">
                              <div className="flex flex-wrap gap-2">
                                {keywords.map((kw, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm cursor-pointer hover:bg-purple-100 hover:text-purple-700"
                                    onClick={() => setSeedKeyword(kw.keyword)}
                                  >
                                    {kw.keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!researchResult && !loading && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Start Your Keyword Research
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Enter a seed keyword to discover related keywords, analyze difficulty, and find opportunities for your SEO strategy.
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'saved' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Saved Research</h2>
              <button
                onClick={loadSavedResearch}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className={`w-4 h-4 ${loadingSaved ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingSaved ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : savedResearch.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No saved research yet</p>
                <p className="text-sm mt-1">Research keywords and save them for later</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedResearch.map((saved) => (
                  <div
                    key={saved.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleLoadSaved(saved)}
                      >
                        <h3 className="font-medium text-gray-900">{saved.seed_keyword}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>{saved.total_keywords} keywords</span>
                          <span>Avg. difficulty: {Math.round(saved.difficulty_avg)}</span>
                          <span>{new Date(saved.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSaved(saved.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default KeywordResearch;
