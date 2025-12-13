import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
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

const TestChatbot = () => {
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
      if (response.data.length > 0) {
        setSelectedBot(response.data[0]);
        setMessages([{
          role: 'assistant',
          content: response.data[0].welcome_message || 'Hello! How can I help you today?'
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
      const response = await api.post(`/chat/${selectedBot.id}/message`, {
        message: userMessage,
        session_id: sessionId,
      });

      setSessionId(response.data.session_id);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response,
        sources: response.data.sources,
      }]);
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Chatbots Yet</h2>
          <p className="text-gray-500 mb-4">Create your first chatbot to start testing.</p>
          <a
            href="/chatbots/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Chatbot
          </a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Test Chatbot</h1>
            <p className="text-sm text-gray-500">Test your chatbots before deploying</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Bot Selector */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedBot?.id || ''}
                onChange={(e) => {
                  const bot = botList.find(b => b.id === e.target.value);
                  if (bot) handleBotChange(bot);
                }}
                className="w-full sm:w-auto appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
              >
                {botList.map(bot => (
                  <option key={bot.id} value={bot.id}>{bot.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {/* Reset Button */}
            <button
              onClick={resetConversation}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Reset conversation"
            >
              <RefreshCw className="w-5 h-5" />
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
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="ml-2">{children}</li>,
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
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  {msg.sources && getUniqueSources(msg.sources).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">Sources:</span>
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
                    <span className="text-sm text-gray-500">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base disabled:opacity-50 min-h-[44px]"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default TestChatbot;
