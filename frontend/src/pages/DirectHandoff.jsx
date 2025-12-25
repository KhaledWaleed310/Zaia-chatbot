import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Loader2,
  Lock,
  AlertCircle,
  CheckCircle,
  User,
  Bot,
  MessageSquare
} from 'lucide-react';
import { handoff } from '@/utils/api';

const API_BASE = '/api/v1';
// For WebSocket, use the current host with ws/wss protocol
const getWsBase = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/v1`;
};

const DirectHandoff = () => {
  const { botId, handoffId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const [botName, setBotName] = useState('');
  const [handoffData, setHandoffData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversationContext, setConversationContext] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [agentName, setAgentName] = useState(() => localStorage.getItem('direct_handoff_agent_name') || '');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [agentNameInput, setAgentNameInput] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const wsRef = useRef(null);

  // Check access on load
  useEffect(() => {
    checkAccess();
  }, [botId, handoffId]);

  // WebSocket connection
  useEffect(() => {
    if (!authenticated || !handoffData) return;

    const token = localStorage.getItem('token');
    const wsBase = getWsBase();
    // DirectHandoff is for agents - always use agent WebSocket endpoint
    // Include token if available for authentication
    const wsUrl = token
      ? `${wsBase}/handoff/${botId}/${handoffId}/ws?token=${token}`
      : `${wsBase}/handoff/${botId}/${handoffId}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'init') {
        setMessages(data.messages || []);
        if (data.conversation_context) {
          setConversationContext(data.conversation_context);
        }
      } else if (data.type === 'message') {
        setMessages(prev => [...prev, data.message]);
      } else if (data.type === 'status_change') {
        setHandoffData(prev => ({ ...prev, status: data.status }));
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    // Ping to keep alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [authenticated, handoffData, botId, handoffId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkAccess = async (pwd = null) => {
    try {
      setLoading(true);
      setPasswordError('');

      const url = pwd
        ? `${API_BASE}/handoff/${botId}/direct/${handoffId}?password=${encodeURIComponent(pwd)}`
        : `${API_BASE}/handoff/${botId}/direct/${handoffId}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setPasswordError('Invalid password');
          return;
        }
        throw new Error(data.detail || 'Failed to access handoff');
      }

      if (data.requires_password && !pwd) {
        setRequiresPassword(true);
        setLoading(false);
        return;
      }

      setBotName(data.bot_name);
      setHandoffData(data.handoff);
      setMessages(data.handoff.messages || []);
      setConversationContext(data.handoff.conversation_context || []);
      setAuthenticated(true);

      // Check if we need agent name
      if (!agentName) {
        setShowNamePrompt(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    checkAccess(password);
  };

  const handleSetAgentName = (e) => {
    e.preventDefault();
    if (agentNameInput.trim()) {
      setAgentName(agentNameInput.trim());
      localStorage.setItem('direct_handoff_agent_name', agentNameInput.trim());
      setShowNamePrompt(false);
      inputRef.current?.focus();
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || sending || !wsRef.current) return;

    const content = messageInput.trim();
    setMessageInput('');
    setSending(true);

    try {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'message',
          content,
          sender_name: agentName || 'Agent'
        }));
        // Message will be added when broadcast is received via WebSocket
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const resolveHandoff = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await handoff.update(botId, handoffId, { status: 'resolved' });
        setHandoffData(prev => ({ ...prev, status: 'resolved' }));
      }
    } catch (err) {
      console.error('Failed to resolve:', err);
    }
  };

  // Password screen
  if (requiresPassword && !authenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Password Required</h1>
            <p className="text-gray-600 mt-2">Enter your notification password to access this chat</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              {passwordError && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {passwordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Access Chat
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Agent name prompt
  if (showNamePrompt) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Enter Your Name</h1>
            <p className="text-gray-600 mt-2">The customer will see this name in the chat</p>
          </div>

          <form onSubmit={handleSetAgentName} className="space-y-4">
            <input
              type="text"
              value={agentNameInput}
              onChange={(e) => setAgentNameInput(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              autoFocus
            />

            <button
              type="submit"
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              Start Chatting
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isResolved = handoffData?.status === 'resolved';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">{botName} - Live Chat</h1>
            <div className="flex items-center gap-2 text-sm">
              {wsConnected ? (
                <span className="flex items-center gap-1 text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="text-gray-500">Connecting...</span>
              )}
              {isResolved && (
                <span className="flex items-center gap-1 text-gray-500">
                  <CheckCircle className="w-4 h-4" />
                  Resolved
                </span>
              )}
            </div>
          </div>
        </div>

        {!isResolved && localStorage.getItem('token') && (
          <button
            onClick={resolveHandoff}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            Mark Resolved
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Conversation Context */}
        {conversationContext.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Previous Bot Conversation</div>
            <div className="space-y-2 opacity-60">
              {conversationContext.slice(-5).map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-b border-dashed border-gray-300 mt-4 mb-2">
              <span className="bg-gray-100 px-2 text-xs text-gray-500 relative -bottom-2">
                Handoff Started
              </span>
            </div>
          </div>
        )}

        {/* Handoff Messages */}
        {messages.map((msg) => {
          const isVisitor = msg.sender_type === 'visitor';
          const isBot = msg.sender_type === 'bot';

          return (
            <div
              key={msg.id}
              className={`flex ${isVisitor ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`flex items-end gap-2 max-w-[80%] ${isVisitor ? '' : 'flex-row-reverse'}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isVisitor ? 'bg-gray-200' : isBot ? 'bg-purple-100' : 'bg-blue-100'
                  }`}
                >
                  {isVisitor ? (
                    <User className="w-4 h-4 text-gray-600" />
                  ) : isBot ? (
                    <Bot className="w-4 h-4 text-purple-600" />
                  ) : (
                    <span className="text-xs font-medium text-blue-600">
                      {(msg.sender_name || 'A')[0].toUpperCase()}
                    </span>
                  )}
                </div>

                <div
                  className={`rounded-2xl px-4 py-2 ${
                    isVisitor
                      ? 'bg-gray-200 text-gray-900 rounded-bl-md'
                      : isBot
                      ? 'bg-purple-100 text-purple-900 rounded-br-md'
                      : 'bg-blue-600 text-white rounded-br-md'
                  }`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isResolved && (
        <div className="bg-white border-t p-4">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!wsConnected}
            />
            <button
              type="submit"
              disabled={!messageInput.trim() || sending || !wsConnected}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default DirectHandoff;
