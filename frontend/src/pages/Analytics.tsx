import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/api/client';
import { UsageStats, Chatbot, PaginatedResponse } from '@/types';
import { format, subDays } from 'date-fns';

export default function Analytics() {
  const [selectedChatbot, setSelectedChatbot] = useState<string>('all');
  const [dateRange, setDateRange] = useState(30);

  const startDate = format(subDays(new Date(), dateRange), 'yyyy-MM-dd');
  const endDate = format(new Date(), 'yyyy-MM-dd');

  // Fetch usage stats
  const { data: usageData, isLoading: usageLoading } = useQuery<UsageStats[]>({
    queryKey: ['analytics-usage', selectedChatbot, startDate, endDate],
    queryFn: async () => {
      const response = await api.analytics.usage({
        start_date: startDate,
        end_date: endDate,
        chatbot_id: selectedChatbot === 'all' ? undefined : selectedChatbot,
      });
      return response.data;
    },
  });

  // Fetch chatbots for filter
  const { data: chatbotsData } = useQuery<PaginatedResponse<Chatbot>>({
    queryKey: ['chatbots'],
    queryFn: async () => {
      const response = await api.chatbots.list();
      return response.data;
    },
  });

  // Calculate summary stats
  const summaryStats = usageData
    ? {
        totalConversations: usageData.reduce((sum, day) => sum + day.conversations, 0),
        totalMessages: usageData.reduce((sum, day) => sum + day.messages, 0),
        totalSessions: usageData.reduce((sum, day) => sum + day.unique_sessions, 0),
        avgMessagesPerConversation:
          usageData.reduce((sum, day) => sum + day.messages, 0) /
          Math.max(usageData.reduce((sum, day) => sum + day.conversations, 0), 1),
      }
    : null;

  // Format data for charts
  const chartData = usageData?.map((day) => ({
    date: format(new Date(day.date), 'MMM d'),
    conversations: day.conversations,
    messages: day.messages,
    sessions: day.unique_sessions,
  }));

  if (usageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor your chatbot usage and performance
        </p>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Chatbot</label>
            <select
              value={selectedChatbot}
              onChange={(e) => setSelectedChatbot(e.target.value)}
              className="input"
            >
              <option value="all">All Chatbots</option>
              {chatbotsData?.items.map((chatbot) => (
                <option key={chatbot.id} value={chatbot.id}>
                  {chatbot.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
              className="input"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="stat-card">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Conversations
            </div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {summaryStats.totalConversations.toLocaleString()}
            </div>
          </div>
          <div className="stat-card">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Messages
            </div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {summaryStats.totalMessages.toLocaleString()}
            </div>
          </div>
          <div className="stat-card">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Unique Sessions
            </div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {summaryStats.totalSessions.toLocaleString()}
            </div>
          </div>
          <div className="stat-card">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Avg Messages/Conv
            </div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {summaryStats.avgMessagesPerConversation.toFixed(1)}
            </div>
          </div>
        </div>
      )}

      {/* Conversations & Messages Chart */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Conversations & Messages Over Time
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="date"
                className="text-xs text-gray-600 dark:text-gray-400"
              />
              <YAxis className="text-xs text-gray-600 dark:text-gray-400" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  border: '1px solid var(--tooltip-border, #ccc)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="conversations"
                stroke="#0ea5e9"
                strokeWidth={2}
                name="Conversations"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="messages"
                stroke="#a855f7"
                strokeWidth={2}
                name="Messages"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sessions Chart */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Unique Sessions
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="date"
                className="text-xs text-gray-600 dark:text-gray-400"
              />
              <YAxis className="text-xs text-gray-600 dark:text-gray-400" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  border: '1px solid var(--tooltip-border, #ccc)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar
                dataKey="sessions"
                fill="#10b981"
                name="Unique Sessions"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="card p-6 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-primary-200 dark:border-primary-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Insights
        </h2>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          {summaryStats && (
            <>
              <li className="flex items-start">
                <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
                <span>
                  Your chatbots handled{' '}
                  <strong>{summaryStats.totalConversations.toLocaleString()}</strong>{' '}
                  conversations in the last {dateRange} days
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
                <span>
                  Average of{' '}
                  <strong>{summaryStats.avgMessagesPerConversation.toFixed(1)}</strong>{' '}
                  messages per conversation
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
                <span>
                  <strong>{summaryStats.totalSessions.toLocaleString()}</strong> unique
                  users engaged with your chatbots
                </span>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
