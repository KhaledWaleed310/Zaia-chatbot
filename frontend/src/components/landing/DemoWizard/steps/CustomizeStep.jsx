import { motion } from 'framer-motion';
import { Bot, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDemoWizard } from '../index';
import { COLOR_PRESETS } from '../constants';

export const CustomizeStep = () => {
  const { demoData, updateData, currentStepData } = useDemoWizard();

  const StepIcon = currentStepData.icon;

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      {/* Left: Customization Options */}
      <div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700 mb-4">
            <StepIcon className="w-4 h-4 mr-2" />
            {currentStepData.estimatedTime}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            {currentStepData.title}
          </h2>

          <p className="text-lg text-gray-600 mb-8">{currentStepData.description}</p>
        </motion.div>

        {/* Color Picker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Brand Color
          </label>
          <div className="flex items-center gap-4">
            <div className="flex gap-2 flex-wrap">
              {COLOR_PRESETS.map((color) => (
                <motion.button
                  key={color.value}
                  onClick={() => updateData({ primaryColor: color.value })}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'w-10 h-10 rounded-full border-2 transition-all',
                    demoData.primaryColor === color.value
                      ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-400'
                      : 'border-transparent hover:border-gray-300'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            <input
              type="color"
              value={demoData.primaryColor}
              onChange={(e) => updateData({ primaryColor: e.target.value })}
              className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-200"
              title="Custom color"
            />
          </div>
        </motion.div>

        {/* Position Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Widget Position
          </label>
          <div className="grid grid-cols-2 gap-4">
            {['bottom-right', 'bottom-left'].map((pos) => (
              <button
                key={pos}
                onClick={() => updateData({ position: pos })}
                className={cn(
                  'p-4 rounded-xl border-2 text-center transition-all',
                  demoData.position === pos
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="w-full h-16 bg-gray-100 rounded-lg relative mb-2">
                  <motion.div
                    className="absolute bottom-2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: demoData.primaryColor }}
                    initial={false}
                    animate={{ x: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <MessageSquare className="w-4 h-4 text-white" />
                  </motion.div>
                  <style>{`
                    .bottom-right-preview { right: 8px; }
                    .bottom-left-preview { left: 8px; }
                  `}</style>
                  <div
                    className={`absolute bottom-2 w-8 h-8 rounded-full flex items-center justify-center ${
                      pos === 'bottom-right' ? 'right-2' : 'left-2'
                    }`}
                    style={{ backgroundColor: demoData.primaryColor }}
                  >
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                </div>
                <span className="text-sm font-medium capitalize">
                  {pos.replace('-', ' ')}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right: Live Preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-100 rounded-2xl p-4 sticky top-4"
      >
        <p className="text-sm text-gray-500 text-center mb-3">Live Preview</p>

        {/* Browser mockup */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Browser chrome */}
          <div className="h-8 bg-gray-200 flex items-center px-3 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <div className="flex-1 mx-4">
              <div className="h-4 bg-white rounded-full px-3 flex items-center">
                <span className="text-[10px] text-gray-400">yourwebsite.com</span>
              </div>
            </div>
          </div>

          {/* Page content mockup */}
          <div className="relative h-[300px] bg-gray-50 p-4">
            {/* Fake content */}
            <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
            <div className="h-3 w-full bg-gray-200 rounded mb-2" />
            <div className="h-3 w-3/4 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-5/6 bg-gray-200 rounded mb-4" />
            <div className="h-3 w-1/2 bg-gray-200 rounded mb-6" />

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-lg" />
              ))}
            </div>

            {/* Chat Widget */}
            <motion.div
              className={`absolute bottom-4 ${
                demoData.position === 'bottom-right' ? 'right-4' : 'left-4'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {/* Chat bubble */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-3 bg-white rounded-xl shadow-lg p-3 max-w-[200px]"
                style={{ borderColor: demoData.primaryColor, borderWidth: 1 }}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: demoData.primaryColor }}
                  >
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="text-xs text-gray-700">
                    Hi! How can I help you today?
                  </div>
                </div>
              </motion.div>

              {/* Widget button */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: demoData.primaryColor }}
              >
                <MessageSquare className="w-6 h-6 text-white" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomizeStep;
