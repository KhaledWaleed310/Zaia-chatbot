import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Layout from '../components/Layout';
import { chatbots } from '../utils/api';
import api from '../utils/api';
import {
  Send,
  Bot,
  User,
  Loader2,
  RefreshCw,
  MessageSquare,
  ChevronDown,
  Database,
  FileText,
  Search,
} from 'lucide-react';

// Custom component to render source citations as badges
const SourceBadge = ({ number }) => (
  <span className="inline-flex items-center justify-center w-4 h-4 mx-0.5 text-[9px] font-bold bg-blue-100 text-blue-600 rounded-full align-text-top border border-blue-200">
    {number}
  </span>
);

// Clean up citation formats to a single consistent format
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

const formatSourceCitations = (text) => normalizeCitations(text);

const TestChatbot = () => {
  const { t } = useTranslation('dashboard');
  const [searchParams] = useSearchParams();
  const [botList, setBotList] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBots, setLoadingBots] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadChatbots();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatbots = async () => {
    try {
      const response = await chatbots.list();
      setBotList(response.data);

      // Check if botId is provided in URL query params
      const botIdFromUrl = searchParams.get('botId');
      let botToSelect = null;

      if (botIdFromUrl) {
        // Try to find the bot with the specified ID
        botToSelect = response.data.find(bot => bot.id === botIdFromUrl);
      }

      // Fall back to first bot if not found or not specified
      if (!botToSelect && response.data.length > 0) {
        botToSelect = response.data[0];
      }

      if (botToSelect) {
        setSelectedBot(botToSelect);
        setMessages([{
          role: 'assistant',
          content: botToSelect.welcome_message || 'Hello! How can I help you today?'
        }]);
      }
    } catch (error) {
      console.error('Failed to load chatbots:', error);
    } finally {
      setLoadingBots(false);
    }
  };

  const handleBotChange = (bot) => {
    setSelectedBot(bot);
    setMessages([{
      role: 'assistant',
      content: bot.welcome_message || 'Hello! How can I help you today?'
    }]);
    setSessionId(null);
    setInput('');
  };

  const resetConversation = () => {
    if (selectedBot) {
      setMessages([{
        role: 'assistant',
        content: selectedBot.welcome_message || 'Hello! How can I help you today?'
      }]);
      setSessionId(null);
      setInput('');
      inputRef.current?.focus();
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedBot || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Use streaming endpoint for faster perceived response
      const response = await fetch(`/api/v1/chat/${selectedBot.id}/message/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let sources = [];
      let newSessionId = sessionId;
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
                newSessionId = parsed.session_id;
                setSessionId(parsed.session_id);
              }
              if (parsed.content) {
                fullContent += parsed.content;

                // Add message on first content, then update it
                if (!messageAdded) {
                  messageAdded = true;
                  setLoading(false); // Hide "Thinking..." indicator
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

      // Finalize the message with sources
      if (messageAdded) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: fullContent,
            sources: sources,
            isStreaming: false,
          };
          return updated;
        });
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        error: true,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Get unique sources (deduplicate by source name)
  const getUniqueSources = (sources) => {
    if (!sources || sources.length === 0) return [];
    const seen = new Set();
    return sources.filter(s => {
      const key = s.source;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Get icon for source type
  const getSourceIcon = (source) => {
    const name = source.toLowerCase();
    if (name.includes('vector') || name.includes('qdrant')) {
      return <Database className="w-3 h-3" />;
    } else if (name.includes('search') || name.includes('fulltext')) {
      return <Search className="w-3 h-3" />;
    } else {
      return <FileText className="w-3 h-3" />;
    }
  };

  if (loadingBots) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  if (botList.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 text-center px-4">
          <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('chatbots.noChatbots', 'No Chatbots Yet')}</h2>
          <p className="text-gray-500 mb-4">{t('chatbots.createFirst', 'Create your first chatbot to start testing.')}</p>
          <a
            href="/chatbots/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('chatbots.create', 'Create Chatbot')}
          </a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{t('test.title', 'Test Chatbot')}</h1>
            <p className="text-xs sm:text-sm text-gray-500">{t('test.subtitle', 'Test your chatbots before deploying')}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bot Selector */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedBot?.id || ''}
                onChange={(e) => {
                  const bot = botList.find(b => b.id === e.target.value);
                  if (bot) handleBotChange(bot);
                }}
                className="w-full sm:w-auto appearance-none bg-white border border-gray-300 rounded-lg px-3 sm:px-4 py-2 pr-8 sm:pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[38px] sm:min-h-[42px]"
              >
                {botList.map(bot => (
                  <option key={bot.id} value={bot.id}>{bot.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {/* Reset Button */}
            <button
              onClick={resetConversation}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors min-h-[38px] min-w-[38px] sm:min-h-[42px] sm:min-w-[42px] flex items-center justify-center flex-shrink-0"
              title={t('test.resetConversation', 'Reset conversation')}
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : msg.error
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm sm:text-base whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="text-sm sm:text-base prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0"><TextWithCitations>{children}</TextWithCitations></p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="ml-2"><TextWithCitations>{children}</TextWithCitations></li>,
                          td: ({ children }) => <td className="border border-gray-300 px-3 py-2 text-sm"><TextWithCitations>{children}</TextWithCitations></td>,
                          th: ({ children }) => <th className="border border-gray-300 px-3 py-2 text-sm font-semibold bg-gray-100">{children}</th>,
                          table: ({ children }) => <div className="overflow-x-auto my-3"><table className="min-w-full border-collapse border border-gray-300 rounded">{children}</table></div>,
                          thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
                          tbody: ({ children }) => <tbody>{children}</tbody>,
                          tr: ({ children }) => <tr className="border-b border-gray-200">{children}</tr>,
                          code: ({ inline, children }) =>
                            inline ? (
                              <code className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
                            ) : (
                              <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto my-2">
                                <code className="text-sm font-mono">{children}</code>
                              </pre>
                            ),
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {formatSourceCitations(msg.content)}
                      </ReactMarkdown>
                    </div>
                  )}
                  {msg.sources && getUniqueSources(msg.sources).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">{t('test.sources', 'Sources')}:</span>
                        {getUniqueSources(msg.sources).slice(0, 3).map((source, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 rounded-full text-xs text-gray-600"
                            title={source.source}
                          >
                            {getSourceIcon(source.source)}
                            <span className="max-w-[100px] truncate">{source.source.split('/').pop() || source.source}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                    <span className="text-sm text-gray-500">{t('test.thinking', 'Thinking...')}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-3 sm:p-4 border-t border-gray-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('test.placeholder', 'Type a message...')}
                disabled={loading}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:opacity-50 min-h-[40px] sm:min-h-[44px]"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 sm:p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default TestChatbot;
