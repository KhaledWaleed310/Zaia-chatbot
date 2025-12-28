import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { seo } from '../../utils/api';
import SEOScoreCircle from '../../components/seo/common/SEOScoreCircle';
import {
  FileText,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Search,
  Type,
  Image,
  List,
  BarChart2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Target,
  Sparkles,
} from 'lucide-react';

const ContentOptimizer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Input State
  const [content, setContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [contentType, setContentType] = useState('article');
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'html'

  // Results State
  const [analysisResult, setAnalysisResult] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    readability: true,
    keywords: true,
    headings: true,
    images: true,
    length: true,
  });

  useEffect(() => {
    const userRole = user?.role || 'user';
    const hasAccess = ['marketing', 'admin', 'super_admin'].includes(userRole) || user?.is_admin;

    if (user && !hasAccess) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    const textToAnalyze = inputMode === 'html' ? '' : content;
    const htmlToAnalyze = inputMode === 'html' ? htmlContent : '';

    if (!textToAnalyze && !htmlToAnalyze) {
      setError('Please enter content to analyze');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const secondaryKws = secondaryKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const res = await seo.analyzeContent({
        content: textToAnalyze || 'N/A',
        html_content: htmlToAnalyze || null,
        primary_keyword: primaryKeyword || null,
        secondary_keywords: secondaryKws,
        content_type: contentType,
      });

      setAnalysisResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze content');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getStatusIcon = (status) => {
    if (status === 'good' || status === 'ideal' || status === 'pass') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (status === 'warning' || status === 'short' || status === 'long') {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeColor = (grade) => {
    const colors = {
      'A': 'bg-green-100 text-green-700',
      'B': 'bg-blue-100 text-blue-700',
      'C': 'bg-yellow-100 text-yellow-700',
      'D': 'bg-orange-100 text-orange-700',
      'F': 'bg-red-100 text-red-700',
    };
    return colors[grade] || colors.C;
  };

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
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Content Optimizer</h1>
              <p className="text-xs sm:text-sm text-gray-500">Analyze and optimize your content for SEO</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Content Input</h2>

            {/* Input Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setInputMode('text')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  inputMode === 'text'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Plain Text
              </button>
              <button
                onClick={() => setInputMode('html')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  inputMode === 'html'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                HTML
              </button>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-4">
              {/* Content Input */}
              {inputMode === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste your content here..."
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={loading}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HTML Content
                  </label>
                  <textarea
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    placeholder="Paste your HTML content here..."
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
                    disabled={loading}
                  />
                </div>
              )}

              {/* Keywords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Keyword
                  </label>
                  <input
                    type="text"
                    value={primaryKeyword}
                    onChange={(e) => setPrimaryKeyword(e.target.value)}
                    placeholder="e.g., chatbot"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Keywords
                  </label>
                  <input
                    type="text"
                    value={secondaryKeywords}
                    onChange={(e) => setSecondaryKeywords(e.target.value)}
                    placeholder="keyword1, keyword2, ..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content Type
                </label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="article">Article</option>
                  <option value="blog_post">Blog Post</option>
                  <option value="landing_page">Landing Page</option>
                  <option value="product_page">Product Page</option>
                </select>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || (!content && !htmlContent)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                Analyze Content
              </button>
            </form>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {analysisResult ? (
              <>
                {/* Overall Score */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Overall Score</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(analysisResult.overall.grade)}`}>
                      Grade {analysisResult.overall.grade}
                    </span>
                  </div>

                  <div className="flex items-center justify-center mb-6">
                    <SEOScoreCircle
                      score={analysisResult.overall.overall_score}
                      size="xl"
                      label="Content Score"
                    />
                  </div>

                  {/* Component Scores */}
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(analysisResult.overall.component_scores).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className={`text-lg font-bold ${getScoreColor(value)}`}>{value}</div>
                        <div className="text-xs text-gray-500 capitalize">{key}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Issues & Recommendations */}
                {(analysisResult.all_issues.length > 0 || analysisResult.all_recommendations.length > 0) && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    {analysisResult.all_issues.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          Issues ({analysisResult.all_issues.length})
                        </h3>
                        <ul className="space-y-1">
                          {analysisResult.all_issues.map((issue, i) => (
                            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-red-400 mt-0.5">•</span>
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.all_recommendations.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Recommendations
                        </h3>
                        <ul className="space-y-1">
                          {analysisResult.all_recommendations.map((rec, i) => (
                            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-blue-400 mt-0.5">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Readability Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => toggleSection('readability')}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-500" />
                      <span className="font-medium">Readability</span>
                      <span className={`ml-2 text-sm ${getScoreColor(analysisResult.readability.scores.flesch_reading_ease)}`}>
                        {analysisResult.readability.scores.flesch_reading_ease}
                      </span>
                    </div>
                    {expandedSections.readability ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>

                  {expandedSections.readability && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-gray-900">
                            {analysisResult.readability.scores.flesch_reading_ease}
                          </div>
                          <div className="text-xs text-gray-500">Flesch Ease</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-gray-900">
                            {analysisResult.readability.scores.flesch_kincaid_grade}
                          </div>
                          <div className="text-xs text-gray-500">Grade Level</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-gray-900">
                            {analysisResult.readability.interpretation.reading_level}
                          </div>
                          <div className="text-xs text-gray-500">Reading Level</div>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Target Audience:</strong> {analysisResult.readability.interpretation.target_audience}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <div className="font-medium">{analysisResult.readability.metrics.words}</div>
                          <div className="text-gray-500">Words</div>
                        </div>
                        <div>
                          <div className="font-medium">{analysisResult.readability.metrics.sentences}</div>
                          <div className="text-gray-500">Sentences</div>
                        </div>
                        <div>
                          <div className="font-medium">{analysisResult.readability.metrics.avg_sentence_length}</div>
                          <div className="text-gray-500">Avg Sentence</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Keywords Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => toggleSection('keywords')}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-500" />
                      <span className="font-medium">Keywords</span>
                      <span className={`ml-2 text-sm ${getScoreColor(analysisResult.keyword_analysis.score)}`}>
                        {analysisResult.keyword_analysis.score}
                      </span>
                    </div>
                    {expandedSections.keywords ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>

                  {expandedSections.keywords && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Primary: {analysisResult.keyword_analysis.primary_keyword || 'Not set'}</span>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(analysisResult.keyword_analysis.primary_status)}
                            <span className="text-sm font-medium">
                              {analysisResult.keyword_analysis.primary_density}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              analysisResult.keyword_analysis.primary_status === 'good'
                                ? 'bg-green-500'
                                : analysisResult.keyword_analysis.primary_status === 'warning'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, analysisResult.keyword_analysis.primary_density * 20)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Found {analysisResult.keyword_analysis.primary_count} times in {analysisResult.keyword_analysis.total_words} words
                        </p>
                      </div>

                      {analysisResult.keyword_analysis.secondary_keywords.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Secondary Keywords</h4>
                          <div className="space-y-2">
                            {analysisResult.keyword_analysis.secondary_keywords.map((kw, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{kw.keyword}</span>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(kw.status)}
                                  <span>{kw.density}% ({kw.count})</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Headings Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => toggleSection('headings')}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <List className="w-5 h-5 text-orange-500" />
                      <span className="font-medium">Headings</span>
                      <span className={`ml-2 text-sm ${getScoreColor(analysisResult.heading_analysis.score)}`}>
                        {analysisResult.heading_analysis.score}
                      </span>
                    </div>
                    {expandedSections.headings ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>

                  {expandedSections.headings && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="grid grid-cols-6 gap-2 mt-4 text-center">
                        {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((h) => (
                          <div key={h} className="p-2 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold">{analysisResult.heading_analysis[`${h}_count`]}</div>
                            <div className="text-xs text-gray-500 uppercase">{h}</div>
                          </div>
                        ))}
                      </div>

                      {analysisResult.heading_analysis.headings.length > 0 && (
                        <div className="mt-4 max-h-40 overflow-y-auto">
                          {analysisResult.heading_analysis.headings.map((h, i) => (
                            <div key={i} className="text-sm py-1" style={{ paddingLeft: `${(h.level - 1) * 16}px` }}>
                              <span className="text-gray-400 mr-2">{h.tag.toUpperCase()}</span>
                              <span className="text-gray-700">{h.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Images Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => toggleSection('images')}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <Image className="w-5 h-5 text-pink-500" />
                      <span className="font-medium">Images</span>
                      <span className={`ml-2 text-sm ${getScoreColor(analysisResult.image_analysis.score)}`}>
                        {analysisResult.image_analysis.score}
                      </span>
                    </div>
                    {expandedSections.images ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>

                  {expandedSections.images && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">{analysisResult.image_analysis.with_alt}</div>
                          <div className="text-xs text-gray-500">With Alt</div>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg">
                          <div className="text-lg font-bold text-red-600">{analysisResult.image_analysis.without_alt}</div>
                          <div className="text-xs text-gray-500">Missing Alt</div>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <div className="text-lg font-bold text-yellow-600">{analysisResult.image_analysis.empty_alt}</div>
                          <div className="text-xs text-gray-500">Empty Alt</div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mt-4">
                        Total: {analysisResult.image_analysis.total_images} images
                      </p>
                    </div>
                  )}
                </div>

                {/* Content Length Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => toggleSection('length')}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-cyan-500" />
                      <span className="font-medium">Content Length</span>
                      <span className={`ml-2 text-sm ${getScoreColor(analysisResult.length_analysis.score)}`}>
                        {analysisResult.length_analysis.score}
                      </span>
                    </div>
                    {expandedSections.length ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>

                  {expandedSections.length && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold">{analysisResult.length_analysis.word_count}</span>
                          <span className="text-sm text-gray-500">words</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              analysisResult.length_analysis.status === 'ideal'
                                ? 'bg-green-500'
                                : analysisResult.length_analysis.status === 'short' || analysisResult.length_analysis.status === 'long'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.min(100, (analysisResult.length_analysis.word_count / analysisResult.length_analysis.recommended_max) * 100)}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Min: {analysisResult.length_analysis.recommended_min}</span>
                          <span>Max: {analysisResult.length_analysis.recommended_max}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          {analysisResult.length_analysis.recommendation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Analyze Your Content
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Paste your content and click "Analyze Content" to get a detailed SEO analysis with readability scores, keyword density, and optimization recommendations.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ContentOptimizer;
