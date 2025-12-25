import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  X,
  Calendar,
  MapPin
} from 'lucide-react';

// Source citation badge
const SourceBadge = ({ number }) => (
  <span className="inline-flex items-center justify-center w-4 h-4 mx-0.5 text-[9px] font-bold bg-blue-100 text-blue-600 rounded-full align-text-top border border-blue-200">
    {number}
  </span>
);

// Normalize citations
const normalizeCitations = (text) => {
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
  const { t } = useTranslation('dashboard');
  const { id } = useParams();

  // Translation helpers for status and priority
  const getStatusLabel = (status) => {
    const labels = {
      pending: t('livechat.status.pending', 'Pending'),
      assigned: t('livechat.status.assigned', 'Assigned'),
      active: t('livechat.status.active', 'Active'),
      resolved: t('livechat.status.resolved', 'Resolved'),
      abandoned: t('livechat.status.abandoned', 'Abandoned')
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      low: t('livechat.priority.low', 'Low'),
      medium: t('livechat.priority.medium', 'Medium'),
      high: t('livechat.priority.high', 'High'),
      urgent: t('livechat.priority.urgent', 'Urgent')
    };
    return labels[priority] || priority;
  };
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
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [agentName, setAgentName] = useState(() => localStorage.getItem('handoff_agent_name') || '');
  const [agentNameInput, setAgentNameInput] = useState('');
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

    // Determine WebSocket URL - use same host as frontend (nginx will proxy)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}`;
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

  const handleStatusChange = async (handoffId, newStatus, assignedName = null) => {
    try {
      const updateData = { status: newStatus };
      if (assignedName) {
        updateData.assigned_to_name = assignedName;
      }
      await handoff.update(id, handoffId, updateData);
      loadData();
      if (selectedHandoff?.id === handoffId) {
        setSelectedHandoff(prev => ({ ...prev, status: newStatus, assigned_to_name: assignedName || prev.assigned_to_name }));
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

    // Save agent name to localStorage for future use
    localStorage.setItem('handoff_agent_name', agentNameInput.trim());
    setAgentName(agentNameInput.trim());
    setShowAcceptModal(false);

    // Accept the chat with the agent's name
    await handleStatusChange(selectedHandoff.id, 'active', agentNameInput.trim());
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedHandoff) return;

    // Use WebSocket if connected, otherwise fall back to REST API
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
              <h1 className="text-2xl font-bold text-gray-900">{bot?.name} - {t('handoff.liveChat', 'Live Chat')}</h1>
              <p className="text-gray-500">{t('livechat.subtitle', 'Manage human handoffs')}</p>
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
              {t('common.settings', 'Settings')}
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('livechat.pending', 'Pending')}</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-200" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('livechat.active', 'Active')}</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-green-200" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('livechat.avgWait', 'Avg Wait')}</p>
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
                  <p className="text-sm text-gray-500">{t('livechat.resolvedToday', 'Resolved Today')}</p>
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
                <option value="">{t('livechat.allStatus', 'All Status')}</option>
                <option value="pending">{t('livechat.pending', 'Pending')}</option>
                <option value="assigned">{t('livechat.assigned', 'Assigned')}</option>
                <option value="active">{t('livechat.active', 'Active')}</option>
                <option value="resolved">{t('livechat.resolved', 'Resolved')}</option>
              </select>
            </div>

            <div className="divide-y max-h-[600px] overflow-y-auto">
              {handoffs.items.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Phone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>{t('livechat.noHandoffs', 'No handoff requests')}</p>
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
                            {getStatusLabel(h.status)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[h.priority]}`}>
                            {getPriorityLabel(h.priority)}
                          </span>
                          {h.trigger === 'booking' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              {t('livechat.booking', 'Booking')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{h.trigger === 'booking' ? `${t('livechat.booking', 'Booking')}: ${h.booking_details?.guest_name || t('livechat.guest', 'Guest')}` : h.trigger}</p>
                        {h.assigned_to_name && (
                          <p className="text-xs text-gray-400 mt-1">
                            {t('livechat.agentLabel', 'Agent')}: {h.assigned_to_name}
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
                        <h3 className="font-semibold">{t('livechat.session', 'Session')}: {selectedHandoff.session_id.slice(0, 8)}...</h3>
                        <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} title={wsConnected ? t('livechat.live', 'Live') : t('livechat.disconnected', 'Disconnected')} />
                        {wsConnected && <span className="text-xs text-green-600">{t('livechat.live', 'Live')}</span>}
                      </div>
                      <p className="text-sm text-gray-500">
                        {t('livechat.trigger', 'Trigger')}: {selectedHandoff.trigger_reason || selectedHandoff.trigger}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {selectedHandoff.status === 'pending' && (
                        <button
                          onClick={handleAcceptChat}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                        >
                          {t('livechat.accept', 'Accept')}
                        </button>
                      )}
                      {['assigned', 'active'].includes(selectedHandoff.status) && (
                        <button
                          onClick={() => handleStatusChange(selectedHandoff.id, 'resolved')}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                        >
                          {t('livechat.resolve', 'Resolve')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Booking Details Card - Show for booking triggers */}
                {selectedHandoff.trigger === 'booking' && selectedHandoff.booking_details && (
                  <div className="mx-4 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {t('livechat.bookingDetails', 'Booking Details')}
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">{t('livechat.bookingType', 'Type')}:</span>
                        <span className="ml-2 font-medium capitalize">
                          {selectedHandoff.booking_details.booking_type || t('livechat.booking', 'Booking')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">{t('livechat.guestName', 'Guest')}:</span>
                        <span className="ml-2 font-medium">
                          {selectedHandoff.booking_details.guest_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">{t('livechat.phone', 'Phone')}:</span>
                        <a
                          href={`https://wa.me/${selectedHandoff.booking_details.phone?.replace(/[^\d+]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-green-600 hover:underline font-medium"
                        >
                          {selectedHandoff.booking_details.phone}
                        </a>
                      </div>
                      <div>
                        <span className="text-gray-600">{t('livechat.date', 'Date')}:</span>
                        <span className="ml-2 font-medium">
                          {selectedHandoff.booking_details.date}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">{t('livechat.time', 'Time')}:</span>
                        <span className="ml-2 font-medium">
                          {selectedHandoff.booking_details.time}
                        </span>
                      </div>
                      {selectedHandoff.booking_details.people_count && (
                        <div>
                          <span className="text-gray-600">{t('livechat.people', 'People')}:</span>
                          <span className="ml-2 font-medium">
                            {selectedHandoff.booking_details.people_count}
                          </span>
                        </div>
                      )}
                      {selectedHandoff.booking_details.purpose && (
                        <div className="col-span-2">
                          <span className="text-gray-600">{t('livechat.purpose', 'Purpose')}:</span>
                          <span className="ml-2 font-medium">
                            {selectedHandoff.booking_details.purpose}
                          </span>
                        </div>
                      )}
                      {selectedHandoff.booking_details.duration && (
                        <div className="col-span-2">
                          <span className="text-gray-600">{t('livechat.duration', 'Duration')}:</span>
                          <span className="ml-2 font-medium">
                            {selectedHandoff.booking_details.duration}
                          </span>
                        </div>
                      )}
                      {selectedHandoff.booking_details.extras?.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-gray-600">{t('livechat.extras', 'Extras')}:</span>
                          <span className="ml-2 font-medium">
                            {selectedHandoff.booking_details.extras.join(', ')}
                          </span>
                        </div>
                      )}
                      {selectedHandoff.booking_details.notes && (
                        <div className="col-span-2">
                          <span className="text-gray-600">{t('livechat.notes', 'Notes')}:</span>
                          <span className="ml-2 font-medium">
                            {selectedHandoff.booking_details.notes}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <a
                        href={`https://wa.me/${selectedHandoff.booking_details.phone?.replace(/[^\d+]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        {t('livechat.contactWhatsApp', 'Contact on WhatsApp')}
                      </a>
                    </div>
                  </div>
                )}

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
                          {msg.role === 'user' ? t('livechat.visitorBotChat', 'Visitor (Bot Chat)') : t('livechat.bot', 'Bot')}
                        </p>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-1 last:mb-0"><TextWithCitations>{children}</TextWithCitations></p>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              ul: ({ children }) => <ul className="list-disc list-inside my-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside my-1">{children}</ol>,
                              li: ({ children }) => <li><TextWithCitations>{children}</TextWithCitations></li>,
                              table: ({ children }) => <div className="overflow-x-auto my-2"><table className="min-w-full border-collapse border border-gray-300 text-xs">{children}</table></div>,
                              th: ({ children }) => <th className="border border-gray-300 px-2 py-1 bg-gray-100">{children}</th>,
                              td: ({ children }) => <td className="border border-gray-300 px-2 py-1"><TextWithCitations>{children}</TextWithCitations></td>,
                            }}
                          >
                            {normalizeCitations(msg.content)}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}

                  {selectedHandoff.conversation_context?.length > 0 && (
                    <div className="text-center text-xs text-gray-400 py-2">
                      --- {t('handoff.handoffStarted', 'Handoff Started')} ---
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
                          {msg.sender_type === 'visitor' ? t('livechat.visitor', 'Visitor') : msg.sender_name || t('livechat.agent', 'Agent')}
                        </p>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-1 last:mb-0"><TextWithCitations>{children}</TextWithCitations></p>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              ul: ({ children }) => <ul className="list-disc list-inside my-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside my-1">{children}</ol>,
                              li: ({ children }) => <li><TextWithCitations>{children}</TextWithCitations></li>,
                              table: ({ children }) => <div className="overflow-x-auto my-2"><table className="min-w-full border-collapse border border-gray-300 text-xs">{children}</table></div>,
                              th: ({ children }) => <th className="border border-gray-300 px-2 py-1 bg-gray-100">{children}</th>,
                              td: ({ children }) => <td className="border border-gray-300 px-2 py-1"><TextWithCitations>{children}</TextWithCitations></td>,
                            }}
                          >
                            {normalizeCitations(msg.content)}
                          </ReactMarkdown>
                        </div>
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
                        placeholder={t('livechat.typePlaceholder', 'Type a message...')}
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
                  <p>{t('livechat.selectHandoff', 'Select a handoff to view details')}</p>
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
                <h3 className="text-lg font-semibold">{t('livechat.handoffSettings', 'Handoff Settings')}</h3>
                <button onClick={() => setShowConfigModal(false)} className="p-2 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{t('livechat.enableHandoff', 'Enable Human Handoff')}</p>
                    <p className="text-sm text-gray-500">{t('livechat.allowVisitors', 'Allow visitors to request live agent')}</p>
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
                    {t('livechat.triggerKeywords', 'Trigger Keywords (one per line)')}
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
                    {t('livechat.sentimentThreshold', 'Sentiment Threshold (-1 to 1)')}
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
                    {t('livechat.unansweredThreshold', 'Unanswered Questions Threshold')}
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
                    {t('livechat.offlineMessage', 'Offline Message')}
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
                    {t('livechat.saveSettings', 'Save Settings')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Accept Chat Modal - Enter Agent Name */}
        {showAcceptModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-md w-full mx-4">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('livechat.acceptChat', 'Accept Chat')}</h3>
                <button onClick={() => setShowAcceptModal(false)} className="p-2 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('livechat.enterYourName', 'Enter your name')}
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    {t('livechat.nameShownToCustomer', 'This name will be shown to the customer during the chat.')}
                  </p>
                  <input
                    type="text"
                    value={agentNameInput}
                    onChange={(e) => setAgentNameInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && agentNameInput.trim() && confirmAcceptChat()}
                    placeholder={t('livechat.namePlaceholder', 'e.g., John, Sarah, Support Team')}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAcceptModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={confirmAcceptChat}
                    disabled={!agentNameInput.trim()}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('livechat.startChat', 'Start Chat')}
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
