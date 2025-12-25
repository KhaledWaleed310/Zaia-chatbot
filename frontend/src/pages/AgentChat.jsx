import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Phone,
  Calendar,
  Clock,
  Users,
  MessageSquare,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { handoff, chatbots } from '@/utils/api';

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

const AgentChat = () => {
  const { id: botId, handoffId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bot, setBot] = useState(null);
  const [handoffData, setHandoffData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversationContext, setConversationContext] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [bookingCollapsed, setBookingCollapsed] = useState(false);
  const [agentName, setAgentName] = useState(() => localStorage.getItem('handoff_agent_name') || '');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [agentNameInput, setAgentNameInput] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const wsRef = useRef(null);

  // Load initial data
  useEffect(() => {
    loadData();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [botId, handoffId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, conversationContext]);

  // WebSocket connection
  useEffect(() => {
    if (!handoffId || !botId || loading) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}`;
    const wsUrl = `${wsHost}/api/v1/handoff/${botId}/${handoffId}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'init') {
        setMessages(data.messages || []);
        setConversationContext(data.conversation_context || []);
        if (data.status) {
          setHandoffData(prev => prev ? { ...prev, status: data.status } : prev);
        }
      } else if (data.type === 'message') {
        setMessages(prev => [...prev, data.message]);
      } else if (data.type === 'status_change') {
        setHandoffData(prev => prev ? { ...prev, status: data.status } : prev);
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

    // Keep connection alive
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
  }, [botId, handoffId, loading]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [botRes, handoffRes] = await Promise.all([
        chatbots.get(botId),
        handoff.get(botId, handoffId)
      ]);

      setBot(botRes.data);
      setHandoffData(handoffRes.data);
      setMessages(handoffRes.data.messages || []);
      setConversationContext(handoffRes.data.conversation_context || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      if (err.response?.status === 404) {
        setError('Chat session not found.');
      } else {
        setError('Failed to load chat session.');
      }
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sending) return;

    // Prompt for name if not set
    if (!agentName) {
      setAgentNameInput('');
      setShowNamePrompt(true);
      return;
    }

    const content = messageInput.trim();
    setMessageInput('');
    setSending(true);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content,
        sender_type: 'agent',
        sender_name: agentName
      }));
      setSending(false);
    } else {
      try {
        await handoff.sendMessage(botId, handoffId, content);
        const res = await handoff.get(botId, handoffId);
        setMessages(res.data.messages || []);
      } catch (err) {
        console.error('Failed to send message:', err);
      } finally {
        setSending(false);
      }
    }

    inputRef.current?.focus();
  };

  const handleAcceptChat = async () => {
    if (!agentName) {
      setAgentNameInput('');
      setShowNamePrompt(true);
      return;
    }

    try {
      await handoff.update(botId, handoffId, {
        status: 'active',
        assigned_to_name: agentName
      });
      setHandoffData(prev => prev ? { ...prev, status: 'active', assigned_to_name: agentName } : prev);
    } catch (err) {
      console.error('Failed to accept chat:', err);
    }
  };

  const handleResolve = async () => {
    try {
      await handoff.update(botId, handoffId, { status: 'resolved' });
      setHandoffData(prev => prev ? { ...prev, status: 'resolved' } : prev);
    } catch (err) {
      console.error('Failed to resolve:', err);
    }
  };

  const confirmAgentName = () => {
    if (!agentNameInput.trim()) return;
    const name = agentNameInput.trim();
    localStorage.setItem('handoff_agent_name', name);
    setAgentName(name);
    setShowNamePrompt(false);

    // If there's pending message, send it now
    if (messageInput.trim()) {
      setTimeout(() => handleSendMessage(), 100);
    }
  };

  const getWhatsAppLink = (phone) => {
    if (!phone) return '#';
    const arabicToWestern = {
      '\u0660': '0', '\u0661': '1', '\u0662': '2', '\u0663': '3', '\u0664': '4',
      '\u0665': '5', '\u0666': '6', '\u0667': '7', '\u0668': '8', '\u0669': '9'
    };
    let cleaned = phone;
    Object.entries(arabicToWestern).forEach(([arabic, western]) => {
      cleaned = cleaned.replace(new RegExp(arabic, 'g'), western);
    });
    cleaned = cleaned.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '20' + cleaned.substring(1);
    }
    return `https://wa.me/${cleaned}`;
  };

  // Markdown components
  const markdownComponents = {
    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed"><TextWithCitations>{children}</TextWithCitations></p>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    ul: ({ children }) => <ul className="list-disc list-outside ml-4 my-2 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-outside ml-4 my-2 space-y-1">{children}</ol>,
    li: ({ children }) => <li><TextWithCitations>{children}</TextWithCitations></li>,
    table: ({ children }) => (
      <div className="overflow-x-auto my-2 rounded-lg border border-gray-200">
        <table className="min-w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="border border-gray-200 px-3 py-2 bg-gray-50 font-semibold">{children}</th>,
    td: ({ children }) => <td className="border border-gray-200 px-3 py-2"><TextWithCitations>{children}</TextWithCitations></td>,
    code: ({ inline, children }) =>
      inline ? (
        <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
      ) : (
        <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto my-2">
          <code className="text-sm font-mono">{children}</code>
        </pre>
      ),
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
        {children}
      </a>
    ),
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading chat session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const bookingDetails = handoffData?.booking_details;
  const isBookingTrigger = handoffData?.trigger === 'booking' && bookingDetails;
  const canChat = ['assigned', 'active'].includes(handoffData?.status);
  const isPending = handoffData?.status === 'pending';
  const isResolved = handoffData?.status === 'resolved';

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* Header */}
      <header
        className="py-4 px-4 sm:px-6 shadow-lg relative overflow-hidden flex-shrink-0"
        style={{ backgroundColor: bot?.primary_color || '#3B82F6' }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 25px 25px, white 2%, transparent 0%)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="max-w-4xl mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Back Button */}
            <button
              onClick={() => navigate(`/chatbots/${botId}/livechat`)}
              className="p-2 sm:p-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl transition-all border border-white/10"
              title="Back to Live Chat"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>

            {/* Bot Avatar */}
            <div className="relative">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-lg border border-white/20"
              >
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${
                wsConnected ? 'bg-green-400' : 'bg-red-400'
              }`} />
            </div>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate text-white">
                {bot?.name} - Live Chat
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium ${
                  isResolved
                    ? 'bg-gray-500 text-white'
                    : canChat
                    ? 'bg-green-500 text-white'
                    : 'bg-yellow-500 text-white'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isResolved ? 'bg-white' : canChat ? 'bg-white animate-pulse' : 'bg-white'
                  }`} />
                  {isResolved ? 'Resolved' : canChat ? 'Active' : 'Pending'}
                </span>
                {wsConnected && (
                  <span className="text-[10px] sm:text-xs text-white/80">Connected</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isPending && (
              <button
                onClick={handleAcceptChat}
                className="px-3 sm:px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Accept</span>
              </button>
            )}
            {canChat && (
              <button
                onClick={handleResolve}
                className="px-3 sm:px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-medium rounded-xl transition-all border border-white/10 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Resolve</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Booking Details - Collapsible */}
      {isBookingTrigger && (
        <div className="flex-shrink-0 bg-white border-b">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setBookingCollapsed(!bookingCollapsed)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Booking Details</p>
                  <p className="text-sm text-gray-500">
                    {bookingDetails.guest_name} - {bookingDetails.date} at {bookingDetails.time}
                  </p>
                </div>
              </div>
              {bookingCollapsed ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {!bookingCollapsed && (
              <div className="px-4 pb-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Type</span>
                      <p className="font-medium capitalize">{bookingDetails.booking_type || 'Booking'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Guest</span>
                      <p className="font-medium">{bookingDetails.guest_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone</span>
                      <a
                        href={getWhatsAppLink(bookingDetails.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-green-600 hover:underline block"
                      >
                        {bookingDetails.phone}
                      </a>
                    </div>
                    <div>
                      <span className="text-gray-500">Date</span>
                      <p className="font-medium">{bookingDetails.date}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Time</span>
                      <p className="font-medium">{bookingDetails.time}</p>
                    </div>
                    {bookingDetails.people_count && (
                      <div>
                        <span className="text-gray-500">People</span>
                        <p className="font-medium">{bookingDetails.people_count}</p>
                      </div>
                    )}
                    {bookingDetails.purpose && (
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-gray-500">Purpose</span>
                        <p className="font-medium">{bookingDetails.purpose}</p>
                      </div>
                    )}
                    {bookingDetails.notes && (
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-gray-500">Notes</span>
                        <p className="font-medium">{bookingDetails.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={getWhatsAppLink(bookingDetails.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Conversation Context */}
          {conversationContext.map((msg, idx) => (
            <div
              key={`ctx-${idx}`}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              {msg.role !== 'user' && (
                <div className="flex-shrink-0 mt-1">
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: bot?.primary_color || '#3B82F6' }}
                  >
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gray-500 flex items-center justify-center shadow-sm">
                    <User className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%] sm:max-w-[75%]`}>
                <span className="text-xs text-gray-400 mb-1 px-1">
                  {msg.role === 'user' ? 'Visitor (Bot Chat)' : 'Bot'}
                </span>
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gray-200 text-gray-900 rounded-tr-md'
                      : 'bg-blue-50 text-gray-800 border border-blue-100 rounded-tl-md'
                  }`}
                >
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {normalizeCitations(msg.content)}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Handoff Separator */}
          {conversationContext.length > 0 && (
            <div className="flex items-center gap-4 py-4">
              <div className="flex-1 border-t border-gray-300" />
              <span className="text-xs font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                Handoff Started
              </span>
              <div className="flex-1 border-t border-gray-300" />
            </div>
          )}

          {/* Live Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender_type === 'visitor' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              {msg.sender_type !== 'visitor' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm">
                    <User className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
              {msg.sender_type === 'visitor' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gray-500 flex items-center justify-center shadow-sm">
                    <User className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              <div className={`flex flex-col ${msg.sender_type === 'visitor' ? 'items-end' : 'items-start'} max-w-[80%] sm:max-w-[75%]`}>
                <span className="text-xs text-gray-400 mb-1 px-1">
                  {msg.sender_type === 'visitor' ? 'Visitor' : msg.sender_name || 'Agent'}
                </span>
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.sender_type === 'visitor'
                      ? 'bg-gray-200 text-gray-900 rounded-tr-md'
                      : 'bg-emerald-50 text-gray-800 border border-emerald-200 rounded-tl-md'
                  }`}
                >
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {normalizeCitations(msg.content)}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {conversationContext.length === 0 && messages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No messages yet</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      {canChat && (
        <div className="bg-white border-t shadow-lg flex-shrink-0">
          <div className="max-w-4xl mx-auto p-4 sm:p-5">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-4 sm:px-5 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white outline-none transition-all text-base placeholder:text-gray-400"
                disabled={sending}
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || !messageInput.trim()}
                className="px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: bot?.primary_color || '#3B82F6' }}
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolved State */}
      {isResolved && (
        <div className="bg-gray-100 border-t flex-shrink-0">
          <div className="max-w-4xl mx-auto p-4 text-center">
            <p className="text-gray-600">This chat has been resolved.</p>
          </div>
        </div>
      )}

      {/* Pending State */}
      {isPending && (
        <div className="bg-yellow-50 border-t border-yellow-200 flex-shrink-0">
          <div className="max-w-4xl mx-auto p-4 text-center">
            <p className="text-yellow-800">Accept this chat to start responding to the visitor.</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-white border-t border-gray-100 py-2 px-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <Sparkles className="w-3 h-3" />
          <span>Powered by</span>
          <span className="font-semibold text-gray-500">Aiden Link</span>
        </div>
      </div>

      {/* Agent Name Prompt Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Enter Your Name</h3>
              <button
                onClick={() => setShowNamePrompt(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600 text-sm">
                Your name will be shown to the visitor during the chat.
              </p>
              <input
                type="text"
                value={agentNameInput}
                onChange={(e) => setAgentNameInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && agentNameInput.trim() && confirmAgentName()}
                placeholder="e.g., John, Sarah, Support Team"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNamePrompt(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAgentName}
                  disabled={!agentNameInput.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentChat;
