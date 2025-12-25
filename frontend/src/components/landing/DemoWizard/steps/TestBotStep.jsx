import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, User, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDemoWizard } from '../index';

const DEMO_RESPONSES = [
  { question: 'What are your pricing plans?', answer: 'We offer three plans: Free ($0), Pro ($29/month), and Business ($99/month). All plans include a 14-day free trial!' },
  { question: 'How do I get started?', answer: 'Getting started is easy! Just sign up, upload your documents, and embed the widget on your website. It takes less than 5 minutes.' },
  { question: 'Do you support Arabic?', answer: 'Yes! We have native Arabic and English support, perfect for MENA businesses. The AI can even switch between languages mid-conversation.' }
];

export const TestBotStep = () => {
  const { demoData, currentStepData } = useDemoWizard();
  const [messages, setMessages] = useState([
    { type: 'bot', text: `Hi! I'm ${demoData.chatbotName || 'your assistant'}. Ask me anything about your business!` }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const StepIcon = currentStepData.icon;

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setIsTyping(true);

    // Find matching response or use default
    const matchedResponse = DEMO_RESPONSES.find(r =>
      userMessage.toLowerCase().includes(r.question.toLowerCase().split(' ')[0])
    );

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        type: 'bot',
        text: matchedResponse?.answer || "I'd be happy to help with that! Based on your uploaded documents, I can provide accurate information about your products, services, and policies."
      }]);
    }, 1500);
  };

  const handleQuickQuestion = (question) => {
    setInputValue(question);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      {/* Left: Description */}
      <div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-cyan-100 text-cyan-700 mb-4">
            <StepIcon className="w-4 h-4 mr-2" />
            {currentStepData.estimatedTime}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            {currentStepData.title}
          </h2>

          <p className="text-lg text-gray-600 mb-6">{currentStepData.description}</p>

          {/* Quick Questions */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Try asking:</p>
            {DEMO_RESPONSES.map((item, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                onClick={() => handleQuickQuestion(item.question)}
                className="block w-full text-left p-3 rounded-lg border border-gray-200 hover:border-cyan-300 hover:bg-cyan-50 transition-colors text-gray-700"
              >
                "{item.question}"
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right: Chat Preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl border shadow-lg overflow-hidden"
      >
        {/* Chat Header */}
        <div
          className="p-4 text-white flex items-center gap-3"
          style={{ backgroundColor: demoData.primaryColor }}
        >
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold">{demoData.chatbotName || 'AI Assistant'}</p>
            <p className="text-xs opacity-80">Online now</p>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="h-[300px] overflow-y-auto p-4 space-y-4 bg-gray-50">
          <AnimatePresence>
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-2 max-w-[80%] ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.type === 'user' ? 'bg-gray-200' : ''
                    }`}
                    style={msg.type === 'bot' ? { backgroundColor: demoData.primaryColor } : {}}
                  >
                    {msg.type === 'user' ? (
                      <User className="w-4 h-4 text-gray-600" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      msg.type === 'user'
                        ? 'bg-gray-200 text-gray-800'
                        : 'bg-white border text-gray-800 shadow-sm'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-2"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: demoData.primaryColor }}
                >
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button onClick={handleSend} size="icon" style={{ backgroundColor: demoData.primaryColor }}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TestBotStep;
