import { useState, useEffect, useRef } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { handoff } from '@/utils/api';
import {
  Users,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  Send,
  Settings,
  Phone,
  RefreshCw,
  Loader2,
  X,
  ExternalLink
} from 'lucide-react';

// Source citation badge
const SourceBadge = ({ number }) => (
  <span className="inline-flex items-center justify-center w-4 h-4 mx-0.5 text-[9px] font-bold bg-blue-100 text-blue-600 rounded-full align-text-top border border-blue-200">
    {number}
  </span>
);

// Normalize citations in text
const normalizeCitations = (text) => {
  if (!text) return '';
  return text
    .replace(/\*+\s*(\[)/g, ' $1')
    .replace(/(\])\s*\*+/g, '$1')
    .replace(/\[\[\[(\d+)\]\]\]/g, '[$1]')
    .replace(/\[\[(\d+)\]\]/g, '[$1]')
    .replace(/\[Source\s*(\d+)\]/gi, '[$1]')
    .replace(/<<(\d+)>>/g, '[$1]')
    .replace(/\[Sources?:?\s*([\d,\s]+)\]/gi, (match, nums) => {
      return nums.split(',').map(n => `[${n.trim()}]`).join('');
    });
};

// Text with inline citation badges
const TextWithCitations = ({ children }) => {
  if (typeof children !== 'string') return children;
  const text = normalizeCitations(children);
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) return <SourceBadge key={i} number={match[1]} />;
    return part;
  });
};

// Markdown components for rendering
const markdownComponents = {
  p: ({ children }) => <p className="mb-1 last:mb-0"><TextWithCitations>{children}</TextWithCitations></p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc list-inside my-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside my-1">{children}</ol>,
  li: ({ children }) => <li><TextWithCitations>{children}</TextWithCitations></li>,
  table: ({ children }) => <div className="overflow-x-auto my-2"><table className="min-w-full border-collapse border border-gray-300 text-xs">{children}</table></div>,
  th: ({ children }) => <th className="border border-gray-300 px-2 py-1 bg-gray-100">{children}</th>,
  td: ({ children }) => <td className="border border-gray-300 px-2 py-1"><TextWithCitations>{children}</TextWithCitations></td>,
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  resolved: 'bg-gray-100 text-gray-700',
  abandoned: 'bg-red-100 text-red-700'
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600'
};

const LiveChatPanel = () => {
  const { bot } = useOutletContext();
  const [searchParams] = useSearchParams();

  const [handoffs, setHandoffs] = useState({ items: [], total: 0 });
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedHandoff, setSelectedHandoff] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [agentName, setAgentName] = useState(() => localStorage.getItem('handoff_agent_name') || '');
  const [agentNameInput, setAgentNameInput] = useState('');
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // Load data on mount and when filter changes
  useEffect(() => {
    if (bot?.id) {
      loadData();
    }
  }, [bot?.id, statusFilter]);

  // Auto-select handoff from URL param
  useEffect(() => {
    const handoffId = searchParams.get('handoff');
    if (handoffId && handoffs.items.length > 0) {
      const found = handoffs.items.find(h => h.id === handoffId);
      if (found) {
        setSelectedHandoff(found);
      }
    }
  }, [searchParams, handoffs.items]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (selectedHandoff) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedHandoff?.messages]);

  // WebSocket connection for real-time chat
  useEffect(() => {
    if (!selectedHandoff?.id || !bot?.id) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Determine WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}`;
    const wsUrl = `${wsHost}/api/v1/handoff/${bot.id}/${selectedHandoff.id}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'init') {
        setSelectedHandoff(prev => ({
          ...prev,
          messages: data.messages || [],
          conversation_context: data.conversation_context || [],
          status: data.status || prev.status
        }));
      } else if (data.type === 'message') {
        setSelectedHandoff(prev => ({
          ...prev,
          messages: [...(prev.messages || []), data.message]
        }));
      } else if (data.type === 'status_change') {
        setSelectedHandoff(prev => ({
          ...prev,
          status: data.status
        }));
        setHandoffs(prev => ({
          ...prev,
          items: prev.items.map(h =>
            h.id === selectedHandoff.id ? { ...h, status: data.status } : h
          )
        }));
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };

    // Ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [selectedHandoff?.id, bot?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [handoffsRes, statsRes, configRes] = await Promise.all([
        handoff.list(bot.id, { status: statusFilter || undefined, per_page: 50 }),
        handoff.getStats(bot.id),
        handoff.getConfig(bot.id)
      ]);

      setHandoffs(handoffsRes.data);
      setStats(statsRes.data);
      setConfig(configRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (handoffId, newStatus, assignedName = null) => {
    try {
      const updateData = { status: newStatus };
      if (assignedName) {
        updateData.assigned_to_name = assignedName;
      }
      await handoff.update(bot.id, handoffId, updateData);
      loadData();
      if (selectedHandoff?.id === handoffId) {
        setSelectedHandoff(prev => ({
          ...prev,
          status: newStatus,
          assigned_to_name: assignedName || prev.assigned_to_name
        }));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAcceptChat = () => {
    setAgentNameInput(agentName || '');
    setShowAcceptModal(true);
  };

  const confirmAcceptChat = async () => {
    if (!agentNameInput.trim()) return;

    localStorage.setItem('handoff_agent_name', agentNameInput.trim());
    setAgentName(agentNameInput.trim());
    setShowAcceptModal(false);

    await handleStatusChange(selectedHandoff.id, 'active', agentNameInput.trim());
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedHandoff) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: messageInput,
        sender_type: 'agent',
        sender_name: agentName || selectedHandoff.assigned_to_name || 'Agent'
      }));
      setMessageInput('');
    } else {
      try {
        await handoff.sendMessage(bot.id, selectedHandoff.id, messageInput);
        setMessageInput('');
        const res = await handoff.get(bot.id, selectedHandoff.id);
        setSelectedHandoff(res.data);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  const handleSaveConfig = async () => {
    try {
      await handoff.updateConfig(bot.id, config);
      setShowConfigModal(false);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const openInNewTab = () => {
    if (selectedHandoff && bot?.id) {
      // Open dedicated full-screen agent chat page
      const url = `${window.location.origin}/chatbots/${bot.id}/chat/${selectedHandoff.id}`;
      window.open(url, '_blank');
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (loading && !handoffs.items.length) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Live Chat</h2>
          <p className="text-sm text-gray-500">Manage human handoff requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-200" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active || 0}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-green-200" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Wait</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(stats.avg_wait_time_seconds || stats.avg_wait_time)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-gray-200" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Resolved Today</p>
                <p className="text-2xl font-bold text-blue-600">{stats.resolved_today || stats.resolved || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-200" />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: List + Chat */}
      <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Handoffs List */}
        <div className="md:col-span-2 lg:col-span-1 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="divide-y overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
            {handoffs.items.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Phone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No handoff requests</p>
              </div>
            ) : (
              handoffs.items.map((h) => (
                <div
                  key={h.id}
                  onClick={() => setSelectedHandoff(h)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedHandoff?.id === h.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[h.status]}`}>
                          {h.status}
                        </span>
                        {h.priority && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[h.priority]}`}>
                            {h.priority}
                          </span>
                        )}
                        {h.trigger === 'booking' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            Booking
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {h.trigger === 'booking'
                          ? `Booking: ${h.booking_details?.guest_name || 'Guest'}`
                          : h.trigger_reason || h.trigger || 'Request'}
                      </p>
                      {h.assigned_to_name && (
                        <p className="text-xs text-gray-400 mt-1">
                          Agent: {h.assigned_to_name}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(h.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="md:col-span-3 lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col" style={{ minHeight: '500px', maxHeight: 'calc(100vh - 300px)' }}>
          {selectedHandoff ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        Session: {(selectedHandoff.session_id || selectedHandoff.id)?.slice(0, 8)}...
                      </h3>
                      <span
                        className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}
                        title={wsConnected ? 'Live' : 'Disconnected'}
                      />
                      {wsConnected && <span className="text-xs text-green-600">Live</span>}
                    </div>
                    <p className="text-sm text-gray-500">
                      Trigger: {selectedHandoff.trigger_reason || selectedHandoff.trigger}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={openInNewTab}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    {selectedHandoff.status === 'pending' && (
                      <button
                        onClick={handleAcceptChat}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      >
                        Accept
                      </button>
                    )}
                    {['assigned', 'active'].includes(selectedHandoff.status) && (
                      <button
                        onClick={() => handleStatusChange(selectedHandoff.id, 'resolved')}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto min-h-0 space-y-4">
                {/* Conversation context (bot chat before handoff) */}
                {selectedHandoff.conversation_context?.map((msg, i) => (
                  <div
                    key={`ctx-${i}`}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] px-4 py-3 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-gray-200 text-gray-900 rounded-tr-md'
                          : 'bg-blue-50 text-gray-800 border border-blue-100 rounded-tl-md'
                      }`}
                    >
                      <p className="text-xs text-gray-400 mb-1.5">
                        {msg.role === 'user' ? 'Visitor (Bot Chat)' : 'Bot'}
                      </p>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {normalizeCitations(msg.content)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Handoff separator */}
                {selectedHandoff.conversation_context?.length > 0 && (
                  <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 border-t border-gray-300" />
                    <span className="text-xs font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                      Handoff Started
                    </span>
                    <div className="flex-1 border-t border-gray-300" />
                  </div>
                )}

                {/* Live messages after handoff */}
                {selectedHandoff.messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] px-4 py-3 rounded-2xl text-sm ${
                        msg.sender_type === 'visitor'
                          ? 'bg-gray-200 text-gray-900 rounded-tr-md'
                          : 'bg-emerald-50 text-gray-800 border border-emerald-200 rounded-tl-md'
                      }`}
                    >
                      <p className="text-xs text-gray-400 mb-1.5">
                        {msg.sender_type === 'visitor' ? 'Visitor' : msg.sender_name || 'Agent'}
                      </p>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {normalizeCitations(msg.content)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Empty state */}
                {!selectedHandoff.conversation_context?.length && !selectedHandoff.messages?.length && (
                  <div className="text-center text-gray-400 py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No messages yet</p>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              {['assigned', 'active'].includes(selectedHandoff.status) && (
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 min-h-[400px]">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select a handoff to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Config Modal */}
      {showConfigModal && config && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Handoff Settings</h3>
              <button onClick={() => setShowConfigModal(false)} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Enable Human Handoff</p>
                  <p className="text-sm text-gray-500">Allow visitors to request live agent</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    config.enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    config.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trigger Keywords (one per line)
                </label>
                <textarea
                  value={config.keywords?.join('\n') || ''}
                  onChange={(e) => setConfig({ ...config, keywords: e.target.value.split('\n').filter(k => k.trim()) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sentiment Threshold (-1 to 1)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="-1"
                  max="1"
                  value={config.sentiment_threshold ?? -0.5}
                  onChange={(e) => setConfig({ ...config, sentiment_threshold: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unanswered Questions Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.unanswered_count_threshold ?? 3}
                  onChange={(e) => setConfig({ ...config, unanswered_count_threshold: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offline Message
                </label>
                <textarea
                  value={config.offline_message || ''}
                  onChange={(e) => setConfig({ ...config, offline_message: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>

              {/* Timeout Settings */}
              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-3">Timeout Settings</h4>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
                  <div>
                    <p className="font-medium">Enable Timeout</p>
                    <p className="text-sm text-gray-500">AI collects contact info if no agent responds</p>
                  </div>
                  <button
                    onClick={() => setConfig({ ...config, timeout_enabled: !config.timeout_enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      config.timeout_enabled !== false ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      config.timeout_enabled !== false ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {config.timeout_enabled !== false && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timeout Minutes (1-10)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={config.timeout_minutes ?? 2}
                      onChange={(e) => setConfig({ ...config, timeout_minutes: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      If no agent responds within this time, AI will collect visitor contact info
                    </p>
                  </div>
                )}
              </div>

              {/* Notification Settings */}
              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-3">Notification Settings</h4>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notification Email
                  </label>
                  <input
                    type="email"
                    value={config.notification_email || ''}
                    onChange={(e) => setConfig({ ...config, notification_email: e.target.value })}
                    placeholder="Leave empty to use account email"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email to receive handoff notifications with direct chat link
                  </p>
                </div>

                {config.notification_email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Direct Link Password
                    </label>
                    <input
                      type="password"
                      value={config.notification_password || ''}
                      onChange={(e) => setConfig({ ...config, notification_password: e.target.value })}
                      placeholder="Set password for direct link access"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Required when using custom notification email for security
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={handleSaveConfig}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accept Chat Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full mx-4">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Accept Chat</h3>
              <button onClick={() => setShowAcceptModal(false)} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your name
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  This name will be shown to the customer during the chat.
                </p>
                <input
                  type="text"
                  value={agentNameInput}
                  onChange={(e) => setAgentNameInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && agentNameInput.trim() && confirmAcceptChat()}
                  placeholder="e.g., John, Sarah, Support Team"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAcceptModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAcceptChat}
                  disabled={!agentNameInput.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { LiveChatPanel };
