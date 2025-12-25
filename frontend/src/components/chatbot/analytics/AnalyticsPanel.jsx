import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { analytics } from '@/utils/api';
import {
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
  RefreshCw,
  Loader2,
  Calendar
} from 'lucide-react';

const AnalyticsPanel = () => {
  const { bot } = useOutletContext();

  const [dashboard, setDashboard] = useState(null);
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (bot?.id) {
      loadData();
    }
  }, [bot?.id, days]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, unansweredRes, heatmapRes] = await Promise.all([
        analytics.getDashboard(bot.id, days),
        analytics.listUnansweredQuestions(bot.id, { per_page: 10 }),
        analytics.getUsageHeatmap(bot.id, 'messages', days)
      ]);

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
      await analytics.updateUnansweredQuestion(bot.id, questionId, { resolved: true });
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
        <span className="flex items-center text-green-600 text-sm">
          <TrendingUp className="w-4 h-4 mr-1" />
          +{(trend * 100).toFixed(1)}%
        </span>
      );
    } else if (trend < 0) {
      return (
        <span className="flex items-center text-red-600 text-sm">
          <TrendingDown className="w-4 h-4 mr-1" />
          {(trend * 100).toFixed(1)}%
        </span>
      );
    }
    return <span className="text-gray-500 text-sm">0%</span>;
  };

  const renderHeatmap = () => {
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Create a map for quick lookup
    const dataMap = {};
    heatmapData.forEach(cell => {
      dataMap[`${cell.day_of_week}-${cell.hour}`] = cell.value;
    });

    const maxValue = Math.max(...heatmapData.map(d => d.value), 1);

    return (
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="min-w-[500px]">
          {/* Hour labels */}
          <div className="flex">
            <div className="w-10 sm:w-12 flex-shrink-0" />
            {hours.map(hour => (
              <div key={hour} className="w-4 sm:w-6 text-[10px] sm:text-xs text-gray-500 text-center">
                {hour % 6 === 0 ? hour : ''}
              </div>
            ))}
          </div>
          {/* Day rows */}
          {dayLabels.map((day, dayIndex) => (
            <div key={day} className="flex items-center">
              <div className="w-10 sm:w-12 text-[10px] sm:text-xs text-gray-500 flex-shrink-0">{day}</div>
              {hours.map(hour => {
                const value = dataMap[`${dayIndex}-${hour}`] || 0;
                const intensity = value / maxValue;
                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className="w-4 sm:w-6 h-4 sm:h-6 m-0.5 rounded-sm"
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
      </div>
    );
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'unanswered', label: 'Unanswered' },
    { id: 'sentiment', label: 'Sentiment' },
    { id: 'quality', label: 'Quality' },
    { id: 'usage', label: 'Usage' }
  ];

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const { unanswered_summary, sentiment_summary, quality_summary, realtime_usage, topic_distribution } = dashboard || {};

  return (
    <div className="space-y-6">
      {/* Header with refresh and period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Analytics</h2>
          <p className="text-sm text-gray-500">Monitor your chatbot's performance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <Calendar className="w-4 h-4 text-gray-500 ml-2" />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-transparent pr-8 py-1.5 text-sm focus:outline-none"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b -mx-4 px-4 sm:mx-0 sm:px-0">
        <nav className="flex gap-1 overflow-x-auto scrollbar-hide pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap pb-3 px-3 sm:px-4 border-b-2 transition-colors text-sm sm:text-base font-medium ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Real-time Stats - 2 cols on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Active Sessions</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {realtime_usage?.active_sessions || 0}
                  </p>
                </div>
                <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Msgs/Hour</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {realtime_usage?.messages_last_hour || 0}
                  </p>
                </div>
                <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Unanswered</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {unanswered_summary?.unresolved || 0}
                  </p>
                </div>
                <HelpCircle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Quality</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {(quality_summary?.avg_overall || 0).toFixed(1)}/10
                  </p>
                </div>
                <Star className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0" />
              </div>
            </div>
          </div>

          {/* Sentiment Overview */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Sentiment Overview</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                <Smile className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mx-auto mb-1 sm:mb-2" />
                <p className="text-lg sm:text-2xl font-bold text-green-700">
                  {sentiment_summary?.positive_count || 0}
                </p>
                <p className="text-xs sm:text-sm text-green-600">Positive</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-yellow-50 rounded-lg">
                <Meh className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 mx-auto mb-1 sm:mb-2" />
                <p className="text-lg sm:text-2xl font-bold text-yellow-700">
                  {sentiment_summary?.neutral_count || 0}
                </p>
                <p className="text-xs sm:text-sm text-yellow-600">Neutral</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg">
                <Frown className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 mx-auto mb-1 sm:mb-2" />
                <p className="text-lg sm:text-2xl font-bold text-red-700">
                  {sentiment_summary?.negative_count || 0}
                </p>
                <p className="text-xs sm:text-sm text-red-600">Negative</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-blue-700 mb-1 sm:mb-2">
                  {formatTrend(sentiment_summary?.trend || 0)}
                </div>
                <p className="text-xs sm:text-sm text-blue-600">Trend</p>
              </div>
            </div>
          </div>

          {/* Usage Heatmap */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Usage Patterns</h3>
            {renderHeatmap()}
            <p className="text-xs sm:text-sm text-gray-500 mt-4">
              Message activity by day and hour
            </p>
          </div>
        </div>
      )}

      {/* Unanswered Questions Tab */}
      {activeTab === 'unanswered' && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 sm:p-6 border-b">
            <h3 className="text-base sm:text-lg font-semibold">Unanswered Questions</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Questions your chatbot couldn't answer confidently
            </p>
          </div>

          {unansweredQuestions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="font-medium">No unanswered questions!</p>
              <p className="text-sm">Your chatbot is handling all queries well.</p>
            </div>
          ) : (
            <div className="divide-y">
              {unansweredQuestions.map((question) => (
                <div key={question.id} className="p-4 hover:bg-gray-50">
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-gray-900 text-sm sm:text-base">{question.question}</p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">
                        {question.response}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] sm:text-xs px-2 py-1 bg-gray-100 rounded-full">
                        {question.detection_method?.replace(/_/g, ' ') || 'unknown'}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-500">
                        Score: {((question.context_score || 0) * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-500">
                        {question.timestamp ? new Date(question.timestamp).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <div>
                      {question.resolved ? (
                        <span className="inline-flex items-center text-green-600 text-xs sm:text-sm">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Resolved
                        </span>
                      ) : (
                        <button
                          onClick={() => handleResolveQuestion(question.id)}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
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
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Sentiment Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 mb-2">Average Sentiment Score</p>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-3xl sm:text-4xl font-bold">
                    {((sentiment_summary?.average_score || 0) * 100).toFixed(0)}
                  </div>
                  <div className="text-gray-500">/ 100</div>
                  {formatTrend(sentiment_summary?.trend || 0)}
                </div>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 mb-2">Distribution</p>
                <div className="h-4 rounded-full overflow-hidden flex bg-gray-100">
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
                <div className="flex flex-wrap justify-between text-[10px] sm:text-xs text-gray-500 mt-2 gap-2">
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
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Response Quality</h3>

            {/* Quality scores - scrollable on mobile */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
              <div className="text-center p-2 sm:p-4 bg-gray-50 rounded-lg">
                <p className="text-xl sm:text-3xl font-bold text-blue-600">
                  {(quality_summary?.avg_overall || 0).toFixed(1)}
                </p>
                <p className="text-[10px] sm:text-sm text-gray-500">Overall</p>
              </div>
              <div className="text-center p-2 sm:p-4 bg-gray-50 rounded-lg">
                <p className="text-xl sm:text-3xl font-bold text-purple-600">
                  {(quality_summary?.avg_relevance || 0).toFixed(1)}
                </p>
                <p className="text-[10px] sm:text-sm text-gray-500">Relevance</p>
              </div>
              <div className="text-center p-2 sm:p-4 bg-gray-50 rounded-lg">
                <p className="text-xl sm:text-3xl font-bold text-green-600">
                  {(quality_summary?.avg_completeness || 0).toFixed(1)}
                </p>
                <p className="text-[10px] sm:text-sm text-gray-500">Complete</p>
              </div>
              <div className="text-center p-2 sm:p-4 bg-gray-50 rounded-lg hidden sm:block">
                <p className="text-xl sm:text-3xl font-bold text-orange-600">
                  {(quality_summary?.avg_accuracy || 0).toFixed(1)}
                </p>
                <p className="text-[10px] sm:text-sm text-gray-500">Accuracy</p>
              </div>
              <div className="text-center p-2 sm:p-4 bg-gray-50 rounded-lg hidden sm:block">
                <p className="text-xl sm:text-3xl font-bold text-teal-600">
                  {(quality_summary?.avg_clarity || 0).toFixed(1)}
                </p>
                <p className="text-[10px] sm:text-sm text-gray-500">Clarity</p>
              </div>
            </div>

            {/* Mobile: Show hidden metrics */}
            <div className="grid grid-cols-2 gap-2 mt-2 sm:hidden">
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold text-orange-600">
                  {(quality_summary?.avg_accuracy || 0).toFixed(1)}
                </p>
                <p className="text-[10px] text-gray-500">Accuracy</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold text-teal-600">
                  {(quality_summary?.avg_clarity || 0).toFixed(1)}
                </p>
                <p className="text-[10px] text-gray-500">Clarity</p>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
                <p className="text-base sm:text-lg font-semibold text-green-700">
                  {quality_summary?.high_quality_count || 0}
                </p>
                <p className="text-xs sm:text-sm text-green-600">High Quality Responses (8+)</p>
              </div>
              <div className="p-3 sm:p-4 bg-red-50 rounded-lg">
                <p className="text-base sm:text-lg font-semibold text-red-700">
                  {quality_summary?.low_quality_count || 0}
                </p>
                <p className="text-xs sm:text-sm text-red-600">Low Quality Responses (&lt;5)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Usage Heatmap</h3>
            {renderHeatmap()}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Real-time Stats</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mx-auto mb-1 sm:mb-2" />
                <p className="text-lg sm:text-2xl font-bold text-blue-700">
                  {realtime_usage?.active_sessions || 0}
                </p>
                <p className="text-xs sm:text-sm text-blue-600">Active Sessions</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mx-auto mb-1 sm:mb-2" />
                <p className="text-lg sm:text-2xl font-bold text-green-700">
                  {realtime_usage?.messages_last_hour || 0}
                </p>
                <p className="text-xs sm:text-sm text-green-600">Messages (Last Hour)</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 mx-auto mb-1 sm:mb-2" />
                <p className="text-lg sm:text-2xl font-bold text-purple-700">
                  {realtime_usage?.messages_last_minute || 0}
                </p>
                <p className="text-xs sm:text-sm text-purple-600">Messages (Last Min)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { AnalyticsPanel };
