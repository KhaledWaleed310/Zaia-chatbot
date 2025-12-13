import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
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
  ChevronDown
} from 'lucide-react';
import axios from 'axios';

const API_BASE = '/api/v1';

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

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      const response = await publicApi.sendMessage(botId, userMessage, sessionId);

      if (response.data.session_id) {
        setSessionId(response.data.session_id);
      }

      const msgId = `msg_${Date.now()}`;
      setMessages(prev => [...prev, {
        id: msgId,
        role: 'assistant',
        content: response.data.response,
      }]);
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: config?.primary_color || '#3B82F6' }}
            >
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{config?.name}</h1>
            <p className="text-gray-600 mt-2">This chatbot is password protected</p>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-2">{passwordError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={verifying || !password.trim()}
              className="w-full py-3 px-4 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: config?.primary_color || '#3B82F6' }}
            >
              {verifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header
        className="py-4 px-6 shadow-sm"
        style={{ backgroundColor: config?.primary_color || '#3B82F6' }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" style={{ color: config?.text_color || '#FFFFFF' }} />
            </div>
            <div>
              <h1 className="text-lg font-semibold" style={{ color: config?.text_color || '#FFFFFF' }}>
                {config?.name}
              </h1>
              {handoffActive && (
                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                  Live Chat
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            {languageConfig?.enabled && languageConfig?.supported_languages?.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="flex items-center gap-1 px-3 py-2 bg-white/20 rounded-lg text-white text-sm"
                >
                  <Globe className="w-4 h-4" />
                  {currentLanguage.toUpperCase()}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showLanguageMenu && (
                  <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg py-1 z-50 min-w-[120px]">
                    {languageConfig.supported_languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                          currentLanguage === lang.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                className="flex items-center gap-1 px-3 py-2 bg-white/20 rounded-lg text-white text-sm hover:bg-white/30 disabled:opacity-50"
              >
                <Phone className="w-4 h-4" />
                {t('human_request') || 'Human'}
              </button>
            )}

            {/* Lead Form Button (manual trigger) */}
            {leadConfig?.enabled && leadConfig?.trigger === 'manual' && !leadSubmitted && (
              <button
                onClick={() => setShowLeadForm(true)}
                className="flex items-center gap-1 px-3 py-2 bg-white/20 rounded-lg text-white text-sm hover:bg-white/30"
              >
                <User className="w-4 h-4" />
                Contact
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx}>
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : msg.role === 'system'
                      ? 'bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-bl-md'
                      : msg.role === 'agent'
                      ? 'bg-green-50 text-green-800 border border-green-200 rounded-bl-md'
                      : msg.isError
                      ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-md'
                      : 'bg-white shadow-sm border border-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                  style={msg.role === 'user' ? { backgroundColor: config?.primary_color } : {}}
                >
                  {msg.agentName && (
                    <p className="text-xs font-medium mb-1">{msg.agentName}</p>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>

              {/* Feedback buttons for assistant messages */}
              {msg.role === 'assistant' && msg.id && !msg.isError && (
                <div className="flex justify-start mt-1 ml-2 gap-1">
                  <button
                    onClick={() => handleFeedback(msg.id, 'thumbs_up')}
                    className={`p-1 rounded ${
                      feedbackGiven[msg.id] === 'thumbs_up'
                        ? 'text-green-600 bg-green-50'
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                    }`}
                    disabled={!!feedbackGiven[msg.id]}
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleFeedback(msg.id, 'thumbs_down')}
                    className={`p-1 rounded ${
                      feedbackGiven[msg.id] === 'thumbs_down'
                        ? 'text-red-600 bg-red-50'
                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                    disabled={!!feedbackGiven[msg.id]}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-white shadow-sm border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('typing') || 'Thinking...'}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Lead Form Modal */}
      {showLeadForm && leadConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{leadConfig.title || t('lead_form_title')}</h3>
              <button onClick={() => setShowLeadForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            {leadConfig.description && (
              <p className="text-gray-600 text-sm mb-4">{leadConfig.description}</p>
            )}
            <form onSubmit={handleLeadSubmit} className="space-y-4">
              {(leadConfig.fields || []).map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={leadFormData[field.id] || ''}
                      onChange={(e) => setLeadFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                      required={field.required}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2 border rounded-lg"
                      rows={3}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={leadFormData[field.id] || ''}
                      onChange={(e) => setLeadFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                      required={field.required}
                      className="w-full px-4 py-2 border rounded-lg"
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
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  )}
                </div>
              ))}
              <button
                type="submit"
                disabled={leadSubmitting}
                className="w-full py-3 rounded-lg text-white font-medium disabled:opacity-50"
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

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('send_message') || 'Type your message...'}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-6 py-3 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              style={{ backgroundColor: config?.primary_color || '#3B82F6' }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SharedChat;
