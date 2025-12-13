import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { handoff, chatbots } from '../utils/api';
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
  Settings,
  Phone,
  UserCheck,
  RefreshCw,
  Loader2,
  X
} from 'lucide-react';

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

const ChatbotHandoff = () => {
  const { id } = useParams();
  const [bot, setBot] = useState(null);
  const [handoffs, setHandoffs] = useState({ items: [], total: 0 });
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedHandoff, setSelectedHandoff] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [id, statusFilter]);

  useEffect(() => {
    if (selectedHandoff) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedHandoff?.messages]);

  // WebSocket connection for real-time chat
  useEffect(() => {
    if (!selectedHandoff?.id || !id) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Determine WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.hostname}:8000`;
    const wsUrl = `${wsHost}/api/v1/handoff/${id}/${selectedHandoff.id}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'init') {
        // Initial data from server
        setSelectedHandoff(prev => ({
          ...prev,
          messages: data.messages || [],
          conversation_context: data.conversation_context || [],
          status: data.status || prev.status
        }));
      } else if (data.type === 'message') {
        // New message received
        setSelectedHandoff(prev => ({
          ...prev,
          messages: [...(prev.messages || []), data.message]
        }));
      } else if (data.type === 'status_change') {
        // Status changed
        setSelectedHandoff(prev => ({
          ...prev,
          status: data.status
        }));
        // Also update in the list
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
  }, [selectedHandoff?.id, id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [botRes, handoffsRes, statsRes, configRes] = await Promise.all([
        chatbots.get(id),
        handoff.list(id, { status: statusFilter || undefined, per_page: 50 }),
        handoff.getStats(id),
        handoff.getConfig(id)
      ]);

      setBot(botRes.data);
      setHandoffs(handoffsRes.data);
      setStats(statsRes.data);
      setConfig(configRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (handoffId, newStatus) => {
    try {
      await handoff.update(id, handoffId, { status: newStatus });
      loadData();
      if (selectedHandoff?.id === handoffId) {
        setSelectedHandoff(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedHandoff) return;

    // Use WebSocket if connected, otherwise fall back to REST API
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: messageInput,
        sender_type: 'agent',
        sender_name: 'Agent'
      }));
      setMessageInput('');
    } else {
      try {
        await handoff.sendMessage(id, selectedHandoff.id, messageInput);
        setMessageInput('');
        // Refresh the selected handoff
        const res = await handoff.get(id, selectedHandoff.id);
        setSelectedHandoff(res.data);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  const handleSaveConfig = async () => {
    try {
      await handoff.updateConfig(id, config);
      setShowConfigModal(false);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (loading && !bot) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/chatbots/${id}`} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{bot?.name} - Live Chat</h1>
              <p className="text-gray-500">Manage human handoffs</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-200" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-green-200" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Wait</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatTime(stats.avg_wait_time_seconds)}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-gray-200" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Resolved Today</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.resolved_today}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-200" />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Handoffs List */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm overflow-hidden">
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

            <div className="divide-y max-h-[600px] overflow-y-auto">
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
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[h.status]}`}>
                            {h.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[h.priority]}`}>
                            {h.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{h.trigger}</p>
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
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
            {selectedHandoff ? (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Session: {selectedHandoff.session_id.slice(0, 8)}...</h3>
                        <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} title={wsConnected ? 'Live' : 'Disconnected'} />
                        {wsConnected && <span className="text-xs text-green-600">Live</span>}
                      </div>
                      <p className="text-sm text-gray-500">
                        Trigger: {selectedHandoff.trigger_reason || selectedHandoff.trigger}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {selectedHandoff.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(selectedHandoff.id, 'active')}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                        >
                          Accept
                        </button>
                      )}
                      {['assigned', 'active'].includes(selectedHandoff.status) && (
                        <button
                          onClick={() => handleStatusChange(selectedHandoff.id, 'resolved')}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto max-h-[400px] space-y-3">
                  {/* Conversation context */}
                  {selectedHandoff.conversation_context?.map((msg, i) => (
                    <div
                      key={`ctx-${i}`}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                          msg.role === 'user'
                            ? 'bg-gray-100 text-gray-900'
                            : 'bg-blue-50 text-blue-900'
                        }`}
                      >
                        <p className="text-xs text-gray-400 mb-1">
                          {msg.role === 'user' ? 'Visitor (Bot Chat)' : 'Bot'}
                        </p>
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {selectedHandoff.conversation_context?.length > 0 && (
                    <div className="text-center text-xs text-gray-400 py-2">
                      --- Handoff Started ---
                    </div>
                  )}

                  {/* Live messages */}
                  {selectedHandoff.messages?.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                          msg.sender_type === 'visitor'
                            ? 'bg-gray-100 text-gray-900'
                            : 'bg-green-100 text-green-900'
                        }`}
                      >
                        <p className="text-xs text-gray-400 mb-1">
                          {msg.sender_type === 'visitor' ? 'Visitor' : msg.sender_name || 'Agent'}
                        </p>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                {['assigned', 'active'].includes(selectedHandoff.status) && (
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border rounded-lg"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
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
                      config.enabled ? 'bg-blue-600' : 'bg-gray-300'
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
                    value={config.sentiment_threshold}
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
                    value={config.unanswered_count_threshold}
                    onChange={(e) => setConfig({ ...config, unanswered_count_threshold: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Offline Message
                  </label>
                  <textarea
                    value={config.offline_message}
                    onChange={(e) => setConfig({ ...config, offline_message: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2}
                  />
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
      </div>
    </Layout>
  );
};

export default ChatbotHandoff;
