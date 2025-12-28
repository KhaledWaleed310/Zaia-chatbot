/**
 * Custom hook for fetching and managing learning data
 * Provides real-time updates with configurable polling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { learning, adminLearning } from '../../../utils/api';

/**
 * Hook for fetching bot-specific learning data
 */
export const useBotLearningData = (botId, options = {}) => {
  const {
    pollInterval = 30000, // 30 seconds default
    enabled = true,
  } = options;

  const [data, setData] = useState({
    stats: null,
    patterns: [],
    knowledge: [],
    insights: [],
    experiments: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    if (!botId || !enabled) return;

    try {
      const [statsRes, patternsRes, knowledgeRes] = await Promise.all([
        learning.getStats(botId),
        learning.getPatterns(botId, 50),
        learning.getKnowledge(botId, 20),
      ]);

      setData({
        stats: statsRes.data,
        patterns: patternsRes.data || [],
        knowledge: knowledgeRes.data || [],
        insights: [],
        experiments: null,
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch learning data:', err);
      setError(err.message || 'Failed to fetch learning data');
    } finally {
      setLoading(false);
    }
  }, [botId, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling
  useEffect(() => {
    if (!enabled || pollInterval <= 0) return;

    const intervalId = setInterval(fetchData, pollInterval);
    return () => clearInterval(intervalId);
  }, [fetchData, pollInterval, enabled]);

  const refetch = useCallback(() => {
    setLoading(true);
    return fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch,
  };
};

/**
 * Hook for fetching aggregated learning data across all bots (for user dashboard)
 */
export const useAggregatedLearningData = (botIds, options = {}) => {
  const {
    pollInterval = 60000, // 60 seconds default
    enabled = true,
  } = options;

  const [data, setData] = useState({
    totalExperiences: 0,
    totalPatterns: 0,
    totalKnowledge: 0,
    totalFeedback: 0,
    recentActivity: [],
    botStats: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!botIds?.length || !enabled) return;

    try {
      // Fetch stats for all bots
      const statsPromises = botIds.map(id =>
        learning.getStats(id).catch(() => ({ data: null }))
      );
      const results = await Promise.all(statsPromises);

      let totalExperiences = 0;
      let totalPatterns = 0;
      let totalKnowledge = 0;
      let totalFeedback = 0;
      const botStats = [];

      results.forEach((res, idx) => {
        const stats = res.data;
        if (stats) {
          totalExperiences += stats.experiences?.total || 0;
          totalPatterns += stats.patterns || 0;
          totalKnowledge += stats.knowledge || 0;
          totalFeedback += stats.feedback?.total || 0;
          botStats.push({
            botId: botIds[idx],
            ...stats,
          });
        }
      });

      setData({
        totalExperiences,
        totalPatterns,
        totalKnowledge,
        totalFeedback,
        recentActivity: [],
        botStats,
      });
      setError(null);
    } catch (err) {
      console.error('Failed to fetch aggregated learning data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [botIds, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!enabled || pollInterval <= 0) return;
    const intervalId = setInterval(fetchData, pollInterval);
    return () => clearInterval(intervalId);
  }, [fetchData, pollInterval, enabled]);

  return { data, loading, error, refetch: fetchData };
};

/**
 * Hook for admin platform-wide learning data
 */
export const usePlatformLearningData = (options = {}) => {
  const {
    pollInterval = 10000, // 10 seconds for admin real-time view
    enabled = true,
  } = options;

  const [data, setData] = useState({
    platformStats: null,
    activityStream: [],
    graphData: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      const [statsRes, activityRes, graphRes] = await Promise.allSettled([
        adminLearning.getPlatformStats(),
        adminLearning.getActivityStream(50),
        adminLearning.getGraphData(),
      ]);

      setData({
        platformStats: statsRes.status === 'fulfilled' ? statsRes.value.data : null,
        activityStream: activityRes.status === 'fulfilled' ? activityRes.value.data?.activities || [] : [],
        graphData: graphRes.status === 'fulfilled' ? graphRes.value.data : null,
      });
      setError(null);
    } catch (err) {
      console.error('Failed to fetch platform learning data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!enabled || pollInterval <= 0) return;
    const intervalId = setInterval(fetchData, pollInterval);
    return () => clearInterval(intervalId);
  }, [fetchData, pollInterval, enabled]);

  return { data, loading, error, refetch: fetchData };
};

/**
 * Hook for animation frame management
 */
export const useAnimationFrame = (callback, enabled = true) => {
  const requestRef = useRef();
  const previousTimeRef = useRef();

  useEffect(() => {
    if (!enabled) return;

    const animate = (time) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        callback(time, deltaTime);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [callback, enabled]);
};

export default {
  useBotLearningData,
  useAggregatedLearningData,
  usePlatformLearningData,
  useAnimationFrame,
};
