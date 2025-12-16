import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Lock,
  Loader2,
  MessageSquare,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  User,
  Phone,
  X,
  Globe,
  ChevronDown,
  ChevronUp,
  Bot,
  Sparkles,
  Minimize2,
  Maximize2,
  Menu,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import axios from 'axios';
import { getOrCreateVisitorId } from '../utils/visitorId';
import ConversationSidebar from '../components/ConversationSidebar';

const API_BASE = '/api/v1';

// Custom component to render source citations as badges
const SourceBadge = ({ number }) => (
  <span className="inline-flex items-center justify-center w-4 h-4 mx-0.5 text-[9px] font-bold bg-blue-100 text-blue-600 rounded-full align-text-top border border-blue-200">
    {number}
  </span>
);

// Clean up citation formats to a single consistent format
const normalizeCitations = (text) => {
  return text
    // Remove stray asterisks before/after brackets
    .replace(/\*+\s*(\[)/g, ' $1')
    .replace(/(\])\s*\*+/g, '$1')
    // Triple brackets [[[1]]] -> [1]
    .replace(/\[\[\[(\d+)\]\]\]/g, '[$1]')
    // Double brackets [[1]] -> [1]
    .replace(/\[\[(\d+)\]\]/g, '[$1]')
    // [Source 1] -> [1]
    .replace(/\[Source\s*(\d+)\]/gi, '[$1]')
    // Handle <<1>> format (from previous processing) -> [1]
    .replace(/<<(\d+)>>/g, '[$1]')
    // Handle comma-separated [Source 1, Source 2] or [1, 2, 3]
    .replace(/\[Sources?:?\s*([\d,\s]+)\]/gi, (match, nums) => {
      return nums.split(',').map(n => `[${n.trim()}]`).join('');
    });
};

// Component to render text with inline citation badges
const TextWithCitations = ({ children }) => {
  if (typeof children !== 'string') {
    return children;
  }

  const text = normalizeCitations(children);
  const parts = text.split(/(\[\d+\])/g);

  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      return <SourceBadge key={i} number={match[1]} />;
    }
    return part;
  });
};

// Don't transform citations in the main text - let ReactMarkdown handle it normally
// and we'll catch citations in the custom text component
const formatSourceCitations = (text) => normalizeCitations(text);

// Public API calls (no auth required)
const publicApi = {
  getConfig: (botId) => axios.get(`${API_BASE}/chatbots/share/${botId}/config`),
  verifyPassword: (botId, password) => axios.post(`${API_BASE}/chatbots/share/${botId}/verify`, { password }),
  checkAccess: (botId, token) => axios.get(`${API_BASE}/chatbots/share/${botId}/check-access?token=${token}`),
  sendMessage: (botId, message, sessionId) => axios.post(`${API_BASE}/chat/${botId}/message`, { message, session_id: sessionId }),

  // Lead form (public endpoints)
  getLeadFormConfig: (botId) => axios.get(`${API_BASE}/leads/${botId}/public-form-config`).catch(() => ({ data: null })),
  submitLead: (botId, data) => axios.post(`${API_BASE}/leads/${botId}/submit`, data),

  // Handoff (public endpoints)
  getHandoffConfig: (botId) => axios.get(`${API_BASE}/handoff/${botId}/public-config`).catch(() => ({ data: { enabled: false } })),
  requestHandoff: (botId, sessionId, reason) => axios.post(`${API_BASE}/handoff/${botId}/request`, { session_id: sessionId, reason, trigger: 'user_request' }),
  getHandoffStatus: (botId, sessionId) => axios.get(`${API_BASE}/handoff/${botId}/session/${sessionId}`).catch(() => ({ data: { active: false } })),
  sendHandoffMessage: (botId, sessionId, content) => axios.post(`${API_BASE}/handoff/${botId}/session/${sessionId}/message`, { content, sender_type: 'visitor' }),

  // Feedback (public endpoint - already exists)
  submitFeedback: (botId, data) => axios.post(`${API_BASE}/feedback/${botId}/submit`, data),

  // Language (public endpoints)
  getLanguageConfig: (botId) => axios.get(`${API_BASE}/translation/chatbots/${botId}/public-config`).catch(() => ({ data: { enabled: false } })),
  getWidgetTranslations: (lang) => axios.get(`${API_BASE}/translation/widget/${lang}`).catch(() => ({ data: { translations: {} } })),

  // Conversation Management (Personal Mode)
  listConversations: (botId, visitorId) =>
    axios.get(`${API_BASE}/chat/${botId}/conversations`, {
      params: { visitor_id: visitorId }
    }),

  getConversation: (botId, sessionId, visitorId) =>
    axios.get(`${API_BASE}/chat/${botId}/conversations/${sessionId}`, {
      params: { visitor_id: visitorId }
    }),

  createConversation: (botId, visitorId) =>
    axios.post(`${API_BASE}/chat/${botId}/conversations`, null, {
      params: { visitor_id: visitorId }
    }),

  updateConversation: (botId, sessionId, visitorId, data) =>
    axios.patch(`${API_BASE}/chat/${botId}/conversations/${sessionId}`, data, {
      params: { visitor_id: visitorId }
    }),

  deleteConversation: (botId, sessionId, visitorId) =>
    axios.delete(`${API_BASE}/chat/${botId}/conversations/${sessionId}`, {
      params: { visitor_id: visitorId }
    }),

  getGreeting: (botId, visitorId) =>
    axios.get(`${API_BASE}/greeting/${botId}`, {
      params: { visitor_id: visitorId }
    }),
};

const SharedChat = () => {
  const { botId } = useParams();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Password protection state
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messageCount, setMessageCount] = useState(0);

  // Lead form state
  const [leadConfig, setLeadConfig] = useState(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadFormData, setLeadFormData] = useState({});
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  // Handoff state
  const [handoffConfig, setHandoffConfig] = useState(null);
  const [handoffActive, setHandoffActive] = useState(false);
  const [handoffStatus, setHandoffStatus] = useState(null);
  const [handoffRequesting, setHandoffRequesting] = useState(false);

  // Feedback state
  const [feedbackGiven, setFeedbackGiven] = useState({});

  // Language state
  const [languageConfig, setLanguageConfig] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [translations, setTranslations] = useState({});
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Visitor ID and conversation state (Personal Mode)
  const [visitorId, setVisitorId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize visitor ID on mount
  useEffect(() => {
    const vid = getOrCreateVisitorId();
    setVisitorId(vid);
  }, []);

  useEffect(() => {
    loadBotConfig();
  }, [botId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for handoff status when active
  useEffect(() => {
    if (handoffActive && sessionId) {
      const interval = setInterval(async () => {
        try {
          const res = await publicApi.getHandoffStatus(botId, sessionId);
          if (res.data.active) {
            setHandoffStatus(res.data.handoff);
            // Check for new messages
            if (res.data.handoff.messages?.length > (handoffStatus?.messages?.length || 0)) {
              const newMsgs = res.data.handoff.messages.slice(handoffStatus?.messages?.length || 0);
              newMsgs.forEach(msg => {
                if (msg.sender_type === 'agent') {
                  setMessages(prev => [...prev, { role: 'agent', content: msg.content, agentName: msg.sender_name }]);
                }
              });
            }
          } else {
            setHandoffActive(false);
            setHandoffStatus(null);
          }
        } catch (e) {
          console.error('Handoff poll error:', e);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [handoffActive, sessionId, handoffStatus]);

  // Check lead form trigger
  useEffect(() => {
    if (leadConfig?.enabled && !leadSubmitted && !showLeadForm) {
      if (leadConfig.trigger === 'after_messages' && messageCount >= leadConfig.trigger_after_messages) {
        setShowLeadForm(true);
      }
    }
  }, [messageCount, leadConfig, leadSubmitted]);

  // Load conversations for personal mode
  useEffect(() => {
    if (config?.is_personal && visitorId && botId) {
      setShowSidebar(true);
      loadConversations();
    }
  }, [config, visitorId, botId]);

  // Fetch personalized greeting for personal mode
  useEffect(() => {
    const fetchGreeting = async () => {
      if (config?.is_personal && visitorId && messages.length <= 1) {
        try {
          const response = await publicApi.getGreeting(botId, visitorId);

          if (response.data.personalized) {
            setMessages([{
              role: 'assistant',
              content: response.data.greeting
            }]);
          }
        } catch (error) {
          console.error('Failed to fetch greeting:', error);
        }
      }
    };

    fetchGreeting();
  }, [config, visitorId, botId]);

  const loadConversations = async () => {
    if (!visitorId || !botId) return;

    try {
      setLoadingConversations(true);
      const response = await publicApi.listConversations(botId, visitorId);
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const scrollToBottom = () => {
    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end'
        });
      }
    });
  };

  const t = (key) => translations[key] || key;

  const loadBotConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const [configRes, leadRes, handoffRes, langRes] = await Promise.all([
        publicApi.getConfig(botId),
        publicApi.getLeadFormConfig(botId),
        publicApi.getHandoffConfig(botId),
        publicApi.getLanguageConfig(botId)
      ]);

      setConfig(configRes.data);
      setLeadConfig(leadRes.data);
      setHandoffConfig(handoffRes.data);
      setLanguageConfig(langRes.data);

      // Load translations
      const defaultLang = langRes.data?.default_language || 'en';
      setCurrentLanguage(defaultLang);
      const transRes = await publicApi.getWidgetTranslations(defaultLang);
      setTranslations(transRes.data.translations || {});

      if (configRes.data.requires_password) {
        const storedToken = localStorage.getItem(`chat_token_${botId}`);
        if (storedToken) {
          const accessCheck = await publicApi.checkAccess(botId, storedToken);
          if (accessCheck.data.has_access) {
            setAccessToken(storedToken);
            setHasAccess(true);
            setMessages([{ role: 'assistant', content: configRes.data.welcome_message }]);
          } else {
            localStorage.removeItem(`chat_token_${botId}`);
            setRequiresPassword(true);
          }
        } else {
          setRequiresPassword(true);
        }
      } else {
        setHasAccess(true);
        setMessages([{ role: 'assistant', content: configRes.data.welcome_message }]);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setError('This chatbot is not publicly shared.');
      } else if (err.response?.status === 404) {
        setError('Chatbot not found.');
      } else {
        setError('Failed to load chatbot. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (langCode) => {
    setCurrentLanguage(langCode);
    setShowLanguageMenu(false);
    const transRes = await publicApi.getWidgetTranslations(langCode);
    setTranslations(transRes.data.translations || {});
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    try {
      setVerifying(true);
      setPasswordError('');
      const response = await publicApi.verifyPassword(botId, password);

      if (response.data.access_granted) {
        setAccessToken(response.data.access_token);
        localStorage.setItem(`chat_token_${botId}`, response.data.access_token);
        setHasAccess(true);
        setRequiresPassword(false);
        setMessages([{ role: 'assistant', content: config.welcome_message }]);
      } else {
        setPasswordError(response.data.error || 'Invalid password');
      }
    } catch (err) {
      setPasswordError('Failed to verify password. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setMessageCount(prev => prev + 1);

    // If handoff is active, send to agent instead
    if (handoffActive && sessionId) {
      try {
        await publicApi.sendHandoffMessage(botId, sessionId, userMessage);
      } catch (err) {
        console.error('Failed to send handoff message:', err);
      }
      return;
    }

    try {
      setSending(true);

      // Get customer's timezone for accurate date parsing
      const customerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Use streaming endpoint for faster perceived response
      const response = await fetch(
        `${API_BASE}/chat/${botId}/message/stream?visitor_id=${visitorId || ''}&timezone=${encodeURIComponent(customerTimezone)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            session_id: sessionId,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let sources = [];
      let messageAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.session_id) {
                setSessionId(parsed.session_id);
              }
              if (parsed.content) {
                fullContent += parsed.content;

                // Add message on first content, then update it
                if (!messageAdded) {
                  messageAdded = true;
                  setSending(false); // Hide typing indicator
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: fullContent,
                    isStreaming: true,
                  }]);
                } else {
                  // Update the streaming message in real-time
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: 'assistant',
                      content: fullContent,
                      isStreaming: true,
                    };
                    return updated;
                  });
                }
              }
              if (parsed.sources) {
                sources = parsed.sources;
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Finalize the message
      if (messageAdded) {
        const msgId = `msg_${Date.now()}`;

        // Check for lead form trigger and strip it from content
        let finalContent = fullContent;
        const hasLeadFormTrigger = fullContent.includes('[SHOW_LEAD_FORM]');
        if (hasLeadFormTrigger) {
          finalContent = fullContent.replace(/\[SHOW_LEAD_FORM\]/g, '').trim();
        }

        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            id: msgId,
            role: 'assistant',
            content: finalContent,
            isStreaming: false,
          };
          return updated;
        });

        // Show lead form if triggered by AI (smart capture)
        if (hasLeadFormTrigger && leadConfig?.enabled && leadConfig?.smart_capture && !leadSubmitted) {
          // Small delay so the message renders first
          setTimeout(() => {
            setShowLeadForm(true);
          }, 500);
        }

        // After message sent successfully, reload conversations to update titles
        if (config?.is_personal) {
          loadConversations();
        }
      }

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        isError: true,
      }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleFeedback = async (messageId, type) => {
    if (feedbackGiven[messageId]) return;

    try {
      await publicApi.submitFeedback(botId, {
        message_id: messageId,
        session_id: sessionId,
        feedback_type: type
      });
      setFeedbackGiven(prev => ({ ...prev, [messageId]: type }));
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  const handleRequestHandoff = async () => {
    if (!sessionId || handoffRequesting) return;

    try {
      setHandoffRequesting(true);
      const res = await publicApi.requestHandoff(botId, sessionId, 'User requested human assistance');

      if (res.data.handoff_id) {
        setHandoffActive(true);
        setMessages(prev => [...prev, {
          role: 'system',
          content: res.data.message || 'Connecting you with a human agent...'
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Unable to connect to a human agent right now. Please try again later.',
        isError: true
      }]);
    } finally {
      setHandoffRequesting(false);
    }
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    if (leadSubmitting) return;

    try {
      setLeadSubmitting(true);
      await publicApi.submitLead(botId, {
        fields: leadFormData,
        session_id: sessionId
      });
      setLeadSubmitted(true);
      setShowLeadForm(false);
      setMessages(prev => [...prev, {
        role: 'system',
        content: leadConfig.success_message || 'Thanks! We\'ll be in touch soon.'
      }]);
    } catch (err) {
      console.error('Lead submit error:', err);
    } finally {
      setLeadSubmitting(false);
    }
  };

  // Create new conversation
  const handleNewConversation = async () => {
    try {
      const response = await publicApi.createConversation(botId, visitorId);
      const newSessionId = response.data.session_id;

      // Reset chat state
      setSessionId(newSessionId);
      setMessages([{
        role: 'assistant',
        content: config?.welcome_message || 'Hello! How can I help you today?'
      }]);
      setMessageCount(0);

      // Reload conversation list
      await loadConversations();

      return newSessionId;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  };

  // Select/load existing conversation
  const handleSelectConversation = async (selectedSessionId) => {
    if (selectedSessionId === sessionId) return;

    try {
      const response = await publicApi.getConversation(botId, selectedSessionId, visitorId);

      const conv = response.data;
      setSessionId(selectedSessionId);

      // Format messages for display
      const formattedMessages = conv.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add welcome message at start if no messages
      if (formattedMessages.length === 0) {
        formattedMessages.push({
          role: 'assistant',
          content: config?.welcome_message || 'Hello! How can I help you today?'
        });
      }

      setMessages(formattedMessages);
      setMessageCount(formattedMessages.filter(m => m.role === 'user').length);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (deleteSessionId) => {
    try {
      await publicApi.deleteConversation(botId, deleteSessionId, visitorId);

      // If deleted current conversation, create new one
      if (deleteSessionId === sessionId) {
        await handleNewConversation();
      } else {
        await loadConversations();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  };

  // Rename conversation
  const handleRenameConversation = async (renameSessionId, newTitle) => {
    try {
      await publicApi.updateConversation(botId, renameSessionId, visitorId, { title: newTitle });
      await loadConversations();
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading chatbot...</p>
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
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Password protection screen
  if (requiresPassword && !hasAccess) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 max-w-md w-full">
          <div className="text-center mb-5 sm:mb-6">
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4"
              style={{ backgroundColor: config?.primary_color || '#3B82F6' }}
            >
              <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">{config?.name}</h1>
            <p className="text-gray-600 mt-1.5 sm:mt-2 text-sm sm:text-base">This chatbot is password protected</p>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-base"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-xs sm:text-sm mt-2">{passwordError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={verifying || !password.trim()}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl text-white text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: config?.primary_color || '#3B82F6' }}
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                  Unlock Chat
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main chat interface
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* Sidebar for Personal Mode - Now properly layered */}
      {config?.is_personal && visitorId && (
        <ConversationSidebar
          conversations={conversations}
          currentSessionId={sessionId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          onClose={() => setShowSidebar(false)}
          loading={loadingConversations}
          primaryColor={config?.primary_color}
          isOpen={showSidebar}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden shared-chat-layout">
        {/* Header - Fixed at top */}
        <header
        className="py-4 sm:py-5 px-4 sm:px-6 shadow-lg relative overflow-hidden flex-shrink-0"
        style={{ backgroundColor: config?.primary_color || '#3B82F6' }}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 25px 25px, white 2%, transparent 0%)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="max-w-3xl mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Sidebar Toggle Button for Personal Mode */}
            {config?.is_personal && (
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 sm:p-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl transition-all border border-white/10"
                title={showSidebar ? 'Hide chats' : 'Show chats'}
              >
                {showSidebar ? (
                  <PanelLeftClose className="w-5 h-5" style={{ color: config?.text_color || '#FFFFFF' }} />
                ) : (
                  <PanelLeft className="w-5 h-5" style={{ color: config?.text_color || '#FFFFFF' }} />
                )}
              </button>
            )}

            {/* Bot Avatar with glow effect */}
            <div className="relative">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-lg border border-white/20"
              >
                <Bot className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: config?.text_color || '#FFFFFF' }} />
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white shadow-sm" />
            </div>

            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold truncate tracking-tight" style={{ color: config?.text_color || '#FFFFFF' }}>
                {config?.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                {handoffActive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Live Chat
                  </span>
                ) : (
                  <span className="text-[11px] sm:text-xs opacity-80" style={{ color: config?.text_color || '#FFFFFF' }}>
                    Online • Ready to help
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* Language Selector */}
            {languageConfig?.enabled && languageConfig?.supported_languages?.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl text-white text-xs sm:text-sm font-medium transition-all border border-white/10"
                >
                  <Globe className="w-4 h-4" />
                  <span className="hidden xs:inline">{currentLanguage.toUpperCase()}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showLanguageMenu && (
                  <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl py-2 z-50 min-w-[120px] sm:min-w-[140px] border border-gray-100 overflow-hidden">
                    {languageConfig.supported_languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${
                          currentLanguage === lang.code ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Human Handoff Button */}
            {handoffConfig?.enabled && !handoffActive && (
              <button
                onClick={handleRequestHandoff}
                disabled={handoffRequesting || !sessionId}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl text-white text-xs sm:text-sm font-medium transition-all disabled:opacity-50 border border-white/10"
              >
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">{t('human_request') || 'Talk to Human'}</span>
              </button>
            )}

            {/* Lead Form Button (manual trigger) */}
            {leadConfig?.enabled && leadConfig?.trigger === 'manual' && !leadSubmitted && (
              <button
                onClick={() => setShowLeadForm(true)}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl text-white text-xs sm:text-sm font-medium transition-all border border-white/10"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Contact Us</span>
              </button>
            )}

            {/* Sidebar Toggle (Personal Mode on mobile) */}
            {config?.is_personal && (
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="md:hidden flex items-center justify-center w-9 h-9 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl text-white transition-all border border-white/10"
                title="Toggle conversations"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}

            {/* Collapse/Expand Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl text-white transition-all border border-white/10"
              title={isCollapsed ? 'Expand chat' : 'Minimize chat'}
            >
              {isCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Messages - Scrollable area in the middle */}
      {!isCollapsed && (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 chat-messages-container min-h-0" style={{ overflowAnchor: 'auto' }}>
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              {msg.role !== 'user' && msg.role !== 'system' && (
                <div className="flex-shrink-0 mt-1">
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: msg.role === 'agent' ? '#10B981' : (config?.primary_color || '#3B82F6') }}
                  >
                    {msg.role === 'agent' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gray-600 flex items-center justify-center shadow-sm">
                    <User className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%] sm:max-w-[75%]`}>
                {/* Sender label for agents */}
                {msg.agentName && (
                  <span className="text-xs font-medium text-gray-500 mb-1 px-1">{msg.agentName}</span>
                )}

                <div
                  className={`px-4 py-3 rounded-2xl text-sm sm:text-[15px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'text-white rounded-tr-md shadow-md'
                      : msg.role === 'system'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200 rounded-tl-md'
                      : msg.role === 'agent'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-tl-md'
                      : msg.isError
                      ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-md'
                      : 'bg-white text-gray-800 shadow-md border border-gray-100/80 rounded-tl-md'
                  }`}
                  style={msg.role === 'user' ? { backgroundColor: config?.primary_color || '#3B82F6' } : {}}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed"><TextWithCitations>{children}</TextWithCitations></p>,
                          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 text-gray-900">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2 text-gray-900">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mt-2.5 mb-1.5 text-gray-900">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc list-outside ml-4 my-2.5 space-y-1.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-outside ml-4 my-2.5 space-y-1.5">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed"><TextWithCitations>{children}</TextWithCitations></li>,
                          td: ({ children }) => <td className="border border-gray-200 px-3 py-2 text-sm"><TextWithCitations>{children}</TextWithCitations></td>,
                          th: ({ children }) => <th className="border border-gray-200 px-3 py-2 text-sm font-semibold bg-gray-50 text-left">{children}</th>,
                          table: ({ children }) => <div className="overflow-x-auto my-3 rounded-lg border border-gray-200"><table className="min-w-full border-collapse">{children}</table></div>,
                          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                          tbody: ({ children }) => <tbody className="divide-y divide-gray-200">{children}</tbody>,
                          tr: ({ children }) => <tr className="hover:bg-gray-50/50">{children}</tr>,
                          code: ({ inline, children }) =>
                            inline ? (
                              <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-[13px] font-mono">{children}</code>
                            ) : (
                              <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto my-3 shadow-inner">
                                <code className="text-sm font-mono">{children}</code>
                              </pre>
                            ),
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline decoration-blue-300 hover:decoration-blue-500 transition-colors">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {formatSourceCitations(msg.content)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Feedback buttons for assistant messages */}
                {msg.role === 'assistant' && msg.id && !msg.isError && (
                  <div className="flex items-center gap-1 mt-1.5 px-1">
                    <button
                      onClick={() => handleFeedback(msg.id, 'thumbs_up')}
                      className={`p-1.5 rounded-lg transition-all ${
                        feedbackGiven[msg.id] === 'thumbs_up'
                          ? 'text-green-600 bg-green-100'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      }`}
                      disabled={!!feedbackGiven[msg.id]}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleFeedback(msg.id, 'thumbs_down')}
                      className={`p-1.5 rounded-lg transition-all ${
                        feedbackGiven[msg.id] === 'thumbs_down'
                          ? 'text-red-600 bg-red-100'
                          : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                      disabled={!!feedbackGiven[msg.id]}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: config?.primary_color || '#3B82F6' }}
                >
                  <Bot className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="bg-white shadow-md border border-gray-100/80 px-4 py-3.5 rounded-2xl rounded-tl-md">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-gray-500 ml-2">{t('typing') || 'Thinking...'}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
      )}

      {/* Lead Form Modal */}
      {showLeadForm && leadConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold">{leadConfig.title || t('lead_form_title')}</h3>
              <button onClick={() => setShowLeadForm(false)} className="p-1.5 hover:bg-gray-100 rounded-full -mr-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            {leadConfig.description && (
              <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">{leadConfig.description}</p>
            )}
            <form onSubmit={handleLeadSubmit} className="space-y-3 sm:space-y-4">
              {(leadConfig.fields || []).map((field) => (
                <div key={field.id}>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={leadFormData[field.id] || ''}
                      onChange={(e) => setLeadFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                      required={field.required}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={leadFormData[field.id] || ''}
                      onChange={(e) => setLeadFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                      required={field.required}
                      className="w-full px-3 py-2 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select...</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={leadFormData[field.id] || ''}
                      onChange={(e) => setLeadFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                      required={field.required}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
              ))}
              <button
                type="submit"
                disabled={leadSubmitting}
                className="w-full py-2.5 sm:py-3 rounded-lg text-white text-sm sm:text-base font-medium disabled:opacity-50"
                style={{ backgroundColor: config?.primary_color || '#3B82F6' }}
              >
                {leadSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  leadConfig.submit_button_text || t('submit') || 'Submit'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Input - Fixed at bottom */}
      {!isCollapsed && (
      <div className="bg-white border-t border-gray-200 shadow-lg flex-shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto p-4 sm:p-5">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('send_message') || 'Type your message...'}
                className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white outline-none transition-all text-base placeholder:text-gray-400"
                disabled={sending}
              />
            </div>
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: config?.primary_color || '#3B82F6' }}
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>

        {/* Footer branding */}
        <div className="border-t border-gray-100 py-2.5 px-4">
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-gray-400">
            <Sparkles className="w-3 h-3" />
            <span>Powered by</span>
            <span className="font-semibold text-gray-500">Aiden</span>
          </div>
        </div>
      </div>
      )}

      {/* Collapsed state - show a small bar */}
      {isCollapsed && (
        <div className="bg-white border-t border-gray-200 py-3 px-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-2 text-sm text-gray-500">
            <MessageSquare className="w-4 h-4" />
            <span>Click the expand button to continue chatting</span>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default SharedChat;
