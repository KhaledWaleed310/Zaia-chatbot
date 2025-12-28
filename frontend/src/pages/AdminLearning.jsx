/**
 * AdminLearning - AIDEN Learning Monitor Page
 * Full-page neural network visualization with real-time activity feed
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Brain,
  Zap,
  Sparkles,
  TrendingUp,
  Activity,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Clock,
  Filter,
  Bot,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import NeuralNetworkCanvas from '../components/learning/NeuralNetworkCanvas';
import { usePlatformLearningData } from '../components/learning/hooks/useLearningData';
import { NODE_COLORS } from '../components/learning/utils/neuralHelpers';

const AdminLearning = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFullscreen = searchParams.get('fullscreen') === 'true';

  const [selectedBot, setSelectedBot] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);

  const { data, loading, error, refetch } = usePlatformLearningData({
    pollInterval: isFullscreen ? 5000 : 10000, // Faster updates in fullscreen
    enabled: true,
  });

  // Check admin access
  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Pass API data directly to visualization (nodes + links format)
  const visualizationData = useMemo(() => {
    if (!data.graphData || !data.graphData.nodes?.length) return null;

    // The API returns { nodes: [...], links: [...] } which NeuralNetworkCanvas now handles directly
    return data.graphData;
  }, [data.graphData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleOpenFullscreen = () => {
    window.open('/admin/learning?fullscreen=true', '_blank', 'noopener,noreferrer');
  };

  // Fullscreen mode - just the visualization
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col">
        {/* Minimal header */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">AIDEN Neural Network</h1>
              <p className="text-slate-400 text-sm">Real-time Learning Visualization</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>Live</span>
            </div>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Full-screen canvas */}
        <div className="flex-1">
          <NeuralNetworkCanvas
            data={visualizationData}
            width={window.innerWidth}
            height={window.innerHeight}
            mode="interactive"
            darkMode={true}
            showLabels={false}
            onNodeHover={setHoveredNode}
          />
        </div>

        {/* Stats bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 to-transparent p-6">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-cyan-400">{data.platformStats?.total_experiences || 0}</p>
              <p className="text-slate-400 text-sm">Experiences</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-400">{data.platformStats?.total_patterns || 0}</p>
              <p className="text-slate-400 text-sm">Patterns</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-400">{data.platformStats?.total_knowledge || 0}</p>
              <p className="text-slate-400 text-sm">Knowledge</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">{data.platformStats?.bots_count || 0}</p>
              <p className="text-slate-400 text-sm">Active Bots</p>
            </div>
          </div>
        </div>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoveredNode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-xl px-4 py-3"
            >
              <p className="text-white font-medium">{hoveredNode.label}</p>
              <p className="text-slate-400 text-sm capitalize">{hoveredNode.type}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Normal admin page layout
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AIDEN Learning Monitor</h1>
              <p className="text-gray-500">Neural network visualization of platform learning</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleOpenFullscreen}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5" />
              <span className="text-cyan-100 text-sm">Experiences</span>
            </div>
            <p className="text-3xl font-bold">{data.platformStats?.total_experiences || 0}</p>
            <p className="text-cyan-200 text-xs mt-1">
              {data.platformStats?.pending_experiences || 0} pending crystallization
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-purple-100 text-sm">Patterns</span>
            </div>
            <p className="text-3xl font-bold">{data.platformStats?.total_patterns || 0}</p>
            <p className="text-purple-200 text-xs mt-1">
              Crystallized from experiences
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-yellow-100 text-sm">Knowledge</span>
            </div>
            <p className="text-3xl font-bold">{data.platformStats?.total_knowledge || 0}</p>
            <p className="text-yellow-200 text-xs mt-1">
              Synthesized strategies
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-5 h-5" />
              <span className="text-green-100 text-sm">Active Bots</span>
            </div>
            <p className="text-3xl font-bold">{data.platformStats?.bots_count || 0}</p>
            <p className="text-green-200 text-xs mt-1">
              {data.platformStats?.active_experiments || 0} experiments running
            </p>
          </div>
        </div>

        {/* Main Visualization Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Neural Network Canvas */}
          <div className="lg:col-span-3 bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-purple-400" />
                <span className="text-white font-medium">Neural Network</span>
                <div className="flex items-center gap-1.5 ml-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 text-xs">Live</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4">
                {Object.entries(NODE_COLORS).slice(0, 4).map(([type, colors]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: colors.primary }}
                    />
                    <span className="text-slate-400 text-xs capitalize">{type}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative" style={{ height: 500 }}>
              <NeuralNetworkCanvas
                data={visualizationData}
                width={900}
                height={500}
                mode="interactive"
                darkMode={true}
                showLabels={false}
                onNodeHover={setHoveredNode}
                className="w-full"
              />

              {/* Hover info */}
              <AnimatePresence>
                {hoveredNode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{hoveredNode.label || 'Node'}</p>
                        <p className="text-slate-400 text-sm capitalize">{hoveredNode.type}</p>
                      </div>
                      {hoveredNode.value && (
                        <div className="text-right">
                          <p className="text-purple-400 font-bold">{Math.round(hoveredNode.value * 100)}%</p>
                          <p className="text-slate-500 text-xs">Confidence</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Activity Feed Sidebar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">Live Activity</span>
              </div>
            </div>

            <div className="h-[460px] overflow-y-auto">
              {data.activityStream?.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {data.activityStream.map((activity, idx) => (
                    <motion.div
                      key={activity.id || idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-1.5 rounded-lg ${
                            activity.type === 'experience'
                              ? 'bg-cyan-100 text-cyan-600'
                              : activity.type === 'pattern'
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-green-100 text-green-600'
                          }`}
                        >
                          {activity.type === 'experience' ? (
                            <Zap className="w-3.5 h-3.5" />
                          ) : activity.type === 'pattern' ? (
                            <Sparkles className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingUp className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{activity.description}</p>
                          <p className="text-xs text-gray-500">{activity.bot_name}</p>
                          {activity.timestamp && (
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(activity.timestamp).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bot Learning Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-900">Learning by Bot</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bot</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Experiences</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Patterns</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Feedback</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.platformStats?.bots_learning?.map((bot) => (
                  <tr key={bot.bot_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Bot className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="font-medium text-gray-900">{bot.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-cyan-600 font-medium">{bot.experiences}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-purple-600 font-medium">{bot.patterns}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-green-600">+{bot.feedback_positive}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-red-500">-{bot.feedback_negative}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        bot.experiences > 10
                          ? 'bg-green-100 text-green-700'
                          : bot.experiences > 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {bot.experiences > 10 ? 'Active' : bot.experiences > 0 ? 'Learning' : 'New'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminLearning;
