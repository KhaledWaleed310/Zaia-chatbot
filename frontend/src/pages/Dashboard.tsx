import { useQuery } from '@tanstack/react-query';
import {
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UsersIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/api/client';
import { DashboardStats } from '@/types';
import clsx from 'clsx';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.analytics.dashboard();
      return response.data;
    },
  });

  const statCards = [
    {
      name: 'Knowledge Bases',
      value: stats?.total_knowledge_bases || 0,
      icon: BookOpenIcon,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive',
    },
    {
      name: 'Documents',
      value: stats?.total_documents || 0,
      icon: DocumentTextIcon,
      color: 'bg-green-500',
      change: '+24',
      changeType: 'positive',
    },
    {
      name: 'Chatbots',
      value: stats?.total_chatbots || 0,
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-purple-500',
      change: `${stats?.active_chatbots || 0} active`,
      changeType: 'neutral',
    },
    {
      name: 'Conversations',
      value: stats?.total_conversations || 0,
      icon: UsersIcon,
      color: 'bg-yellow-500',
      change: '+89',
      changeType: 'positive',
    },
    {
      name: 'Messages',
      value: stats?.total_messages || 0,
      icon: ChatBubbleOvalLeftEllipsisIcon,
      color: 'bg-pink-500',
      change: '+324',
      changeType: 'positive',
    },
  ];

  if (isLoading) {
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Welcome to your ZAIA RAG Chatbot Platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat) => (
          <div key={stat.name} className="stat-card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={clsx('p-3 rounded-lg', stat.color)}>
                  <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {stat.name}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {stat.value.toLocaleString()}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div
                className={clsx(
                  'inline-flex items-baseline text-sm font-semibold',
                  stat.changeType === 'positive'
                    ? 'text-green-600 dark:text-green-400'
                    : stat.changeType === 'negative'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                {stat.changeType === 'positive' && (
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                )}
                {stat.change}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                from last month
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <div className="space-y-4">
            {[
              {
                action: 'New knowledge base created',
                subject: 'Product Documentation',
                time: '2 hours ago',
              },
              {
                action: 'Chatbot deployed',
                subject: 'Customer Support Bot',
                time: '5 hours ago',
              },
              {
                action: 'Documents uploaded',
                subject: '15 new files to Marketing KB',
                time: '1 day ago',
              },
              {
                action: 'High conversation volume',
                subject: 'Support Bot - 234 conversations',
                time: '2 days ago',
              },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0"
              >
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary-600 dark:bg-primary-400"></div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.action}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {activity.subject}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <a
              href="/knowledge-bases"
              className="flex items-center p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors group"
            >
              <BookOpenIcon className="h-6 w-6 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Create Knowledge Base
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Upload documents and build your knowledge base
                </p>
              </div>
            </a>
            <a
              href="/chatbots/new"
              className="flex items-center p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors group"
            >
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Deploy New Chatbot
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Configure and deploy a new chatbot
                </p>
              </div>
            </a>
            <a
              href="/analytics"
              className="flex items-center p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors group"
            >
              <ArrowTrendingUpIcon className="h-6 w-6 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  View Analytics
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Analyze usage and performance metrics
                </p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="card p-6 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-primary-200 dark:border-primary-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Getting Started
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Follow these steps to set up your first chatbot
        </p>
        <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-primary-600 text-white text-xs mr-3">
              1
            </span>
            <span>Create a knowledge base and upload your documents</span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-primary-600 text-white text-xs mr-3">
              2
            </span>
            <span>Wait for documents to be processed and indexed</span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-primary-600 text-white text-xs mr-3">
              3
            </span>
            <span>Configure and deploy a chatbot linked to your knowledge base</span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-primary-600 text-white text-xs mr-3">
              4
            </span>
            <span>Embed the chatbot widget on your website or application</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
