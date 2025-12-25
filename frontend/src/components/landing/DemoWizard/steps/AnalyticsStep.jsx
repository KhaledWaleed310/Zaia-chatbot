import { motion } from 'framer-motion';
import { TrendingUp, Users, MessageSquare, ThumbsUp, Clock, DollarSign } from 'lucide-react';
import { useDemoWizard } from '../index';

const DEMO_STATS = [
  { label: 'Total Conversations', value: '2,847', change: '+23%', icon: MessageSquare, color: 'blue' },
  { label: 'Unique Visitors', value: '1,234', change: '+18%', icon: Users, color: 'purple' },
  { label: 'Satisfaction Rate', value: '94%', change: '+5%', icon: ThumbsUp, color: 'green' },
  { label: 'Avg Response Time', value: '1.2s', change: '-0.3s', icon: Clock, color: 'amber' },
  { label: 'Leads Captured', value: '156', change: '+31%', icon: TrendingUp, color: 'cyan' },
  { label: 'Cost Savings', value: '$4,200', change: '+12%', icon: DollarSign, color: 'emerald' }
];

const colorClasses = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', badge: 'bg-blue-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', badge: 'bg-purple-500' },
  green: { bg: 'bg-green-100', text: 'text-green-600', badge: 'bg-green-500' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600', badge: 'bg-amber-500' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', badge: 'bg-cyan-500' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', badge: 'bg-emerald-500' }
};

export const AnalyticsStep = () => {
  const { currentStepData } = useDemoWizard();

  const StepIcon = currentStepData.icon;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-rose-100 text-rose-700 mb-4">
          <StepIcon className="w-4 h-4 mr-2" />
          {currentStepData.estimatedTime}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          {currentStepData.title}
        </h2>

        <p className="text-lg text-gray-600 max-w-2xl mx-auto">{currentStepData.description}</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {DEMO_STATS.map((stat, index) => {
          const colors = colorClasses[stat.color];
          const StatIcon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                  <StatIcon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Chart Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl border p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900">Conversations Over Time</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm bg-rose-100 text-rose-700 rounded-lg font-medium">7 Days</button>
            <button className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">30 Days</button>
            <button className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">90 Days</button>
          </div>
        </div>

        {/* Simple bar chart visualization */}
        <div className="flex items-end justify-between h-40 gap-2">
          {[65, 45, 80, 55, 90, 70, 85].map((height, index) => (
            <motion.div
              key={index}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ delay: 0.4 + index * 0.05, duration: 0.5 }}
              className="flex-1 bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-lg relative group"
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {Math.round(height * 3)} chats
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
      </motion.div>

      {/* Top Questions Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 bg-white rounded-xl border p-6"
      >
        <h3 className="font-semibold text-gray-900 mb-4">Top Questions Asked</h3>
        <div className="space-y-3">
          {[
            { question: 'What are your pricing plans?', count: 234 },
            { question: 'How do I get started?', count: 189 },
            { question: 'Do you offer a free trial?', count: 156 }
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">{item.question}</span>
              <span className="text-sm font-medium text-gray-500">{item.count} times</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default AnalyticsStep;
