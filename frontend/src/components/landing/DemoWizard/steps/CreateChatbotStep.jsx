import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDemoWizard } from '../index';
import { DEMO_INDUSTRIES } from '../constants';

export const CreateChatbotStep = () => {
  const { demoData, updateData, currentStepData } = useDemoWizard();

  const handleIndustrySelect = (industry) => {
    updateData({ industry });
  };

  const StepIcon = currentStepData.icon;

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      {/* Left: Form */}
      <div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 mb-4">
            <StepIcon className="w-4 h-4 mr-2" />
            {currentStepData.estimatedTime}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            {currentStepData.title}
          </h2>

          <p className="text-lg text-gray-600 mb-8">{currentStepData.description}</p>

          {/* Chatbot Name Input */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chatbot Name
            </label>
            <Input
              placeholder="e.g., Support Assistant, Sales Bot"
              value={demoData.chatbotName}
              onChange={(e) => updateData({ chatbotName: e.target.value })}
              className="h-12 text-lg"
            />
            <p className="text-sm text-gray-500 mt-2">
              This name will be displayed to your visitors
            </p>
          </div>

          {/* Industry Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Your Industry
            </label>
            <div className="grid grid-cols-2 gap-3">
              {DEMO_INDUSTRIES.map((industry) => {
                const IndustryIcon = industry.Icon;
                return (
                  <motion.button
                    key={industry.id}
                    onClick={() => handleIndustrySelect(industry)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all',
                      demoData.industry?.id === industry.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <IndustryIcon className="w-6 h-6 mb-2 text-purple-600" />
                    <span className="font-medium text-gray-900 text-sm">
                      {industry.name}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right: Live Preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 border sticky top-4"
      >
        <div className="text-center">
          <motion.div
            animate={{
              scale: demoData.chatbotName ? [1, 1.1, 1] : 1,
              rotate: demoData.chatbotName ? [0, 5, -5, 0] : 0
            }}
            transition={{ duration: 0.5 }}
            className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
          >
            <Bot className="w-12 h-12 text-white" />
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.h3
              key={demoData.chatbotName || 'default'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-2xl font-bold text-gray-900 mb-2"
            >
              {demoData.chatbotName || 'Your Assistant'}
            </motion.h3>
          </AnimatePresence>

          <p className="text-gray-600">
            {demoData.industry
              ? `${demoData.industry.name} specialist`
              : 'Ready to help your customers'}
          </p>

          {demoData.industry && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-white rounded-xl shadow-sm"
            >
              <div className="flex items-center justify-center text-sm text-purple-600">
                <Sparkles className="w-4 h-4 mr-2" />
                AI optimized for {demoData.industry.name.toLowerCase()}
              </div>
            </motion.div>
          )}

          {/* Preview chat bubble */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 p-4 bg-white rounded-xl shadow-sm text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-700">
                Hi! I'm {demoData.chatbotName || 'your assistant'}. How can I help you
                today?
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateChatbotStep;
