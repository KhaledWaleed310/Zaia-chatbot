/**
 * AidenLearningWidget - Dashboard widget showing AIDEN's learning progress
 * Displays neural network visualization with stats overlay
 */

import React, { useState, useMemo } from 'react';
import { Brain, Sparkles, TrendingUp, Zap, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NeuralNetworkCanvas from './NeuralNetworkCanvas';
import { useAggregatedLearningData } from './hooks/useLearningData';

/**
 * Generate visualization nodes from aggregated learning stats
 */
const generateVisualizationData = (data, chatbots) => {
  if (!data || !chatbots?.length) return null;

  const nodes = [];
  const links = [];

  // Create bot nodes
  chatbots.forEach((bot, idx) => {
    const botId = bot.id || bot._id;
    const botStats = data.botStats?.find(b => b.botId === botId);
    const expCount = botStats?.experiences?.total || 0;

    nodes.push({
      id: `bot-${botId}`,
      type: 'bot',
      label: bot.name || `Bot ${idx + 1}`,
      value: Math.min(1.0, expCount / 50), // Normalize
    });
  });

  // Create pattern nodes based on total patterns
  const patternCount = Math.min(data.totalPatterns || 0, 8); // Max 8 patterns for compact view
  for (let i = 0; i < patternCount; i++) {
    const patternId = `pattern-${i}`;
    nodes.push({
      id: patternId,
      type: 'pattern',
      label: `Pattern ${i + 1}`,
      value: 0.5 + Math.random() * 0.5,
    });

    // Link to a random bot
    if (nodes.filter(n => n.type === 'bot').length > 0) {
      const botNodes = nodes.filter(n => n.type === 'bot');
      const randomBot = botNodes[Math.floor(Math.random() * botNodes.length)];
      links.push({
        source: randomBot.id,
        target: patternId,
        strength: 0.5,
      });
    }
  }

  // Create knowledge nodes based on total knowledge
  const knowledgeCount = Math.min(data.totalKnowledge || 0, 3);
  for (let i = 0; i < knowledgeCount; i++) {
    const knowledgeId = `knowledge-${i}`;
    nodes.push({
      id: knowledgeId,
      type: 'knowledge',
      label: `Knowledge ${i + 1}`,
      value: 0.7 + Math.random() * 0.3,
    });

    // Link to patterns
    const patternNodes = nodes.filter(n => n.type === 'pattern');
    if (patternNodes.length > 0) {
      const randomPattern = patternNodes[Math.floor(Math.random() * patternNodes.length)];
      links.push({
        source: randomPattern.id,
        target: knowledgeId,
        strength: 0.7,
      });
    }
  }

  // Create some experience nodes for visual activity
  const expCount = Math.min(data.totalExperiences || 0, 5);
  for (let i = 0; i < expCount; i++) {
    const expId = `exp-${i}`;
    nodes.push({
      id: expId,
      type: 'experience',
      label: `Experience ${i + 1}`,
      value: 0.3 + Math.random() * 0.4,
    });

    // Link to a bot
    const botNodes = nodes.filter(n => n.type === 'bot');
    if (botNodes.length > 0) {
      const randomBot = botNodes[Math.floor(Math.random() * botNodes.length)];
      links.push({
        source: randomBot.id,
        target: expId,
        strength: 0.3,
      });
    }
  }

  return { nodes, links };
};

const AidenLearningWidget = ({ chatbots = [], className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);

  const botIds = useMemo(() => chatbots.map(bot => bot.id || bot._id), [chatbots]);

  const { data, loading, error } = useAggregatedLearningData(botIds, {
    pollInterval: 60000, // 1 minute
    enabled: botIds.length > 0,
  });

  // Calculate learning progress percentage
  const learningProgress = useMemo(() => {
    if (!data || data.totalPatterns === 0) return 15; // Base progress
    const patternsScore = Math.min(data.totalPatterns * 5, 40);
    const knowledgeScore = Math.min(data.totalKnowledge * 10, 30);
    const experienceScore = Math.min(data.totalExperiences * 0.5, 20);
    return Math.min(patternsScore + knowledgeScore + experienceScore + 10, 100);
  }, [data]);

  // Determine evolution status message
  const evolutionStatus = useMemo(() => {
    if (data.totalPatterns === 0) {
      return { message: 'Starting to learn...', level: 'new' };
    } else if (data.totalPatterns < 5) {
      return { message: 'Discovering patterns', level: 'learning' };
    } else if (data.totalKnowledge > 0) {
      return { message: 'Building knowledge', level: 'growing' };
    } else {
      return { message: 'Actively evolving', level: 'evolving' };
    }
  }, [data]);

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950" />

      {/* Animated background glow */}
      <div className="absolute top-1/4 left-1/2 w-96 h-96 -translate-x-1/2 -translate-y-1/2 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl" />

      <div className="relative z-10 p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                Your AIDEN is Evolving
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </h3>
              <p className="text-slate-400 text-xs">{evolutionStatus.message}</p>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight
              className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          </button>
        </div>

        {/* Neural Network Visualization */}
        <div
          className="relative rounded-xl overflow-hidden mb-4"
          style={{ height: isExpanded ? 280 : 160 }}
        >
          <NeuralNetworkCanvas
            data={generateVisualizationData(data, chatbots)}
            width={400}
            height={isExpanded ? 280 : 160}
            mode={isExpanded ? 'interactive' : 'ambient'}
            darkMode={true}
            onNodeHover={setHoveredNode}
            className="w-full"
          />

          {/* Hover tooltip */}
          <AnimatePresence>
            {hoveredNode && isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2"
              >
                <p className="text-white text-xs font-medium">{hoveredNode.label}</p>
                <p className="text-slate-400 text-xs capitalize">{hoveredNode.type}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 text-xs">Experiences</span>
            </div>
            <p className="text-white font-bold text-lg">{data.totalExperiences}</p>
          </div>

          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400 text-xs">Patterns</span>
            </div>
            <p className="text-white font-bold text-lg">{data.totalPatterns}</p>
          </div>

          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-slate-400 text-xs">Knowledge</span>
            </div>
            <p className="text-white font-bold text-lg">{data.totalKnowledge}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-xs">Learning Progress</span>
            <span className="text-purple-400 text-xs font-medium">{learningProgress}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${learningProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <h4 className="text-slate-300 text-xs font-medium mb-2">Learning by Bot</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {data.botStats?.map((bot, idx) => (
                  <div
                    key={bot.botId}
                    className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
                  >
                    <span className="text-white text-xs truncate flex-1">
                      {chatbots[idx]?.name || `Bot ${idx + 1}`}
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-cyan-400">{bot.experiences?.total || 0} exp</span>
                      <span className="text-purple-400">{bot.patterns || 0} pat</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-slate-500 text-xs mt-3 text-center">
                AIDEN learns from every conversation to serve your customers better
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default AidenLearningWidget;
