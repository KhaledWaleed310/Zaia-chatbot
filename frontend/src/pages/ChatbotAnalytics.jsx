import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { analytics, chatbots } from '../utils/api';
import {
  ArrowLeft,
  HelpCircle,
  Smile,
  Meh,
  Frown,
  Star,
  Clock,
  Activity,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown
} from 'lucide-react';

const ChatbotAnalytics = () => {
  const { id } = useParams();
  const [bot, setBot] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [id, days]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [botRes, dashboardRes, unansweredRes, heatmapRes] = await Promise.all([
        chatbots.get(id),
        analytics.getDashboard(id, days),
        analytics.listUnansweredQuestions(id, { per_page: 10 }),
        analytics.getUsageHeatmap(id, 'messages', days)
      ]);

      setBot(botRes.data);
      setDashboard(dashboardRes.data);
      setUnansweredQuestions(unansweredRes.data.items || []);
      setHeatmapData(heatmapRes.data.data || []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveQuestion = async (questionId) => {
    try {
      await analytics.updateUnansweredQuestion(id, questionId, { resolved: true });
      setUnansweredQuestions(prev =>
        prev.map(q => q.id === questionId ? { ...q, resolved: true } : q)
      );
    } catch (error) {
      console.error('Failed to resolve question:', error);
    }
  };

  const getSentimentIcon = (label) => {
    switch (label) {
      case 'positive':
        return <Smile className="w-5 h-5 text-green-500" />;
      case 'negative':
        return <Frown className="w-5 h-5 text-red-500" />;
      default:
        return <Meh className="w-5 h-5 text-yellow-500" />;
    }
  };

  const formatTrend = (trend) => {
    if (trend > 0) {
      return (
        <span className="flex items-center text-green-600">
          <TrendingUp className="w-4 h-4 mr-1" />
          +{(trend * 100).toFixed(1)}%
        </span>
      );
    } else if (trend < 0) {
      return (
        <span className="flex items-center text-red-600">
          <TrendingDown className="w-4 h-4 mr-1" />
          {(trend * 100).toFixed(1)}%
        </span>
      );
    }
    return <span className="text-gray-500">0%</span>;
  };

  const renderHeatmap = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Create a map for quick lookup
    const dataMap = {};
    heatmapData.forEach(cell => {
      dataMap[`${cell.day_of_week}-${cell.hour}`] = cell.value;
    });

    const maxValue = Math.max(...heatmapData.map(d => d.value), 1);

    return (
      <div className="overflow-x-auto">
        <div className="flex">
          <div className="w-12" />
          {hours.map(hour => (
            <div key={hour} className="w-6 text-xs text-gray-500 text-center">
              {hour}
            </div>
          ))}
        </div>
        {days.map((day, dayIndex) => (
          <div key={day} className="flex items-center">
            <div className="w-12 text-xs text-gray-500">{day}</div>
            {hours.map(hour => {
              const value = dataMap[`${dayIndex}-${hour}`] || 0;
              const intensity = value / maxValue;
              return (
                <div
                  key={`${dayIndex}-${hour}`}
                  className="w-6 h-6 m-0.5 rounded"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}
                  title={`${day} ${hour}:00 - ${value} messages`}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </Layout>
    );
  }

  if (!bot) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Chatbot not found</p>
          <Link to="/chatbots" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Chatbots
          </Link>
        </div>
      </Layout>
    );
  }

  const { unanswered_summary, sentiment_summary, quality_summary, realtime_usage, topic_distribution } = dashboard || {};

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/chatbots/${id}`} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{bot.name} Analytics</h1>
              <p className="text-gray-500">Detailed insights and performance metrics</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={loadData}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex gap-6">
            {['overview', 'unanswered', 'sentiment', 'quality', 'usage'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Real-time Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active Sessions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {realtime_usage?.active_sessions || 0}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Messages (Last Hour)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {realtime_usage?.messages_last_hour || 0}
                    </p>
                  </div>
                  <MessageSquare className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Unanswered</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {unanswered_summary?.unresolved || 0}
                    </p>
                  </div>
                  <HelpCircle className="w-8 h-8 text-orange-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Quality Score</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(quality_summary?.avg_overall || 0).toFixed(1)}/10
                    </p>
                  </div>
                  <Star className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* Sentiment Overview */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Sentiment Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Smile className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">
                    {sentiment_summary?.positive_count || 0}
                  </p>
                  <p className="text-sm text-green-600">Positive</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Meh className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-700">
                    {sentiment_summary?.neutral_count || 0}
                  </p>
                  <p className="text-sm text-yellow-600">Neutral</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <Frown className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-700">
                    {sentiment_summary?.negative_count || 0}
                  </p>
                  <p className="text-sm text-red-600">Negative</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700 mb-2">
                    {formatTrend(sentiment_summary?.trend || 0)}
                  </div>
                  <p className="text-sm text-blue-600">Trend</p>
                </div>
              </div>
            </div>

            {/* Usage Heatmap */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Usage Patterns</h3>
              {renderHeatmap()}
              <p className="text-sm text-gray-500 mt-4">
                Showing message activity by day and hour
              </p>
            </div>
          </div>
        )}

        {/* Unanswered Questions Tab */}
        {activeTab === 'unanswered' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Unanswered Questions</h3>
              <p className="text-sm text-gray-500 mt-1">
                Questions that your chatbot couldn't answer confidently
              </p>
            </div>

            {unansweredQuestions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p>No unanswered questions!</p>
                <p className="text-sm">Your chatbot is handling all queries well.</p>
              </div>
            ) : (
              <div className="divide-y">
                {unansweredQuestions.map((question) => (
                  <div key={question.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{question.question}</p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {question.response}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                            {question.detection_method.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            Score: {(question.context_score * 100).toFixed(0)}%
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(question.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        {question.resolved ? (
                          <span className="inline-flex items-center text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Resolved
                          </span>
                        ) : (
                          <button
                            onClick={() => handleResolveQuestion(question.id)}
                            className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sentiment Tab */}
        {activeTab === 'sentiment' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Sentiment Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Average Sentiment Score</p>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold">
                      {((sentiment_summary?.average_score || 0) * 100).toFixed(0)}
                    </div>
                    <div className="text-gray-500">/ 100</div>
                    {formatTrend(sentiment_summary?.trend || 0)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">Distribution</p>
                  <div className="h-4 rounded-full overflow-hidden flex">
                    <div
                      className="bg-green-500"
                      style={{
                        width: `${(sentiment_summary?.positive_count / sentiment_summary?.total_messages * 100) || 0}%`
                      }}
                    />
                    <div
                      className="bg-yellow-500"
                      style={{
                        width: `${(sentiment_summary?.neutral_count / sentiment_summary?.total_messages * 100) || 0}%`
                      }}
                    />
                    <div
                      className="bg-red-500"
                      style={{
                        width: `${(sentiment_summary?.negative_count / sentiment_summary?.total_messages * 100) || 0}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Positive: {sentiment_summary?.positive_count || 0}</span>
                    <span>Neutral: {sentiment_summary?.neutral_count || 0}</span>
                    <span>Negative: {sentiment_summary?.negative_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quality Tab */}
        {activeTab === 'quality' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Response Quality</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">
                    {(quality_summary?.avg_overall || 0).toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500">Overall</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-purple-600">
                    {(quality_summary?.avg_relevance || 0).toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500">Relevance</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">
                    {(quality_summary?.avg_completeness || 0).toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500">Completeness</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-orange-600">
                    {(quality_summary?.avg_accuracy || 0).toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500">Accuracy</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-teal-600">
                    {(quality_summary?.avg_clarity || 0).toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500">Clarity</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-lg font-semibold text-green-700">
                    {quality_summary?.high_quality_count || 0}
                  </p>
                  <p className="text-sm text-green-600">High Quality Responses (8+)</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-lg font-semibold text-red-700">
                    {quality_summary?.low_quality_count || 0}
                  </p>
                  <p className="text-sm text-red-600">Low Quality Responses (&lt;5)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Usage Heatmap</h3>
              {renderHeatmap()}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Real-time Stats</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Activity className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-700">
                    {realtime_usage?.active_sessions || 0}
                  </p>
                  <p className="text-sm text-blue-600">Active Sessions</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Clock className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">
                    {realtime_usage?.messages_last_hour || 0}
                  </p>
                  <p className="text-sm text-green-600">Messages (Last Hour)</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <MessageSquare className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-700">
                    {realtime_usage?.messages_last_minute || 0}
                  </p>
                  <p className="text-sm text-purple-600">Messages (Last Minute)</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ChatbotAnalytics;
