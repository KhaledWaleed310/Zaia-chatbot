import { useState } from 'react';
import { motion } from 'framer-motion';
import { Headphones, User, MessageCircle, Bell, Clock, ArrowRight, Check, AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDemoWizard } from '../index';

const HANDOFF_TRIGGERS = [
  { id: 'request', label: 'Customer requests human', enabled: true },
  { id: 'sentiment', label: 'Negative sentiment detected', enabled: true },
  { id: 'complex', label: 'Complex query detected', enabled: true },
  { id: 'vip', label: 'VIP customer identified', enabled: false }
];

const TEAM_MEMBERS = [
  { id: 1, name: 'Sarah Chen', role: 'Support Lead', status: 'online', avatar: 'SC' },
  { id: 2, name: 'Mike Johnson', role: 'Sales Rep', status: 'online', avatar: 'MJ' },
  { id: 3, name: 'Emily Davis', role: 'Tech Support', status: 'away', avatar: 'ED' }
];

export const HandoffStep = () => {
  const { currentStepData } = useDemoWizard();
  const [triggers, setTriggers] = useState(HANDOFF_TRIGGERS);
  const [showHandoffDemo, setShowHandoffDemo] = useState(false);

  const StepIcon = currentStepData.icon;

  const toggleTrigger = (id) => {
    setTriggers(prev =>
      prev.map(t => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-violet-100 text-violet-700 mb-4">
          <StepIcon className="w-4 h-4 mr-2" />
          {currentStepData.estimatedTime}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          {currentStepData.title}
        </h2>

        <p className="text-lg text-gray-600 max-w-2xl mx-auto">{currentStepData.description}</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: Configuration */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Handoff Triggers */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Handoff Triggers</h3>
            <div className="space-y-3">
              {triggers.map((trigger) => (
                <div
                  key={trigger.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-colors',
                    trigger.enabled ? 'border-violet-200 bg-violet-50' : 'border-gray-200 bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        trigger.enabled ? 'bg-violet-100' : 'bg-gray-100'
                      )}
                    >
                      {trigger.id === 'request' && (
                        <MessageCircle
                          className={cn('w-4 h-4', trigger.enabled ? 'text-violet-600' : 'text-gray-400')}
                        />
                      )}
                      {trigger.id === 'sentiment' && (
                        <AlertCircle
                          className={cn('w-4 h-4', trigger.enabled ? 'text-violet-600' : 'text-gray-400')}
                        />
                      )}
                      {trigger.id === 'complex' && (
                        <Zap
                          className={cn('w-4 h-4', trigger.enabled ? 'text-violet-600' : 'text-gray-400')}
                        />
                      )}
                      {trigger.id === 'vip' && (
                        <User
                          className={cn('w-4 h-4', trigger.enabled ? 'text-violet-600' : 'text-gray-400')}
                        />
                      )}
                    </div>
                    <span className="font-medium text-gray-900">{trigger.label}</span>
                  </div>
                  <button
                    onClick={() => toggleTrigger(trigger.id)}
                    className={cn(
                      'w-10 h-6 rounded-full transition-colors relative',
                      trigger.enabled ? 'bg-violet-500' : 'bg-gray-300'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                        trigger.enabled ? 'right-1' : 'left-1'
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Team Assignment */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Available Team</h3>
            <div className="space-y-3">
              {TEAM_MEMBERS.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-semibold text-sm">
                      {member.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        member.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                      )}
                    />
                    <span className="text-xs text-gray-500 capitalize">{member.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Column: Live Demo */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-white rounded-xl border p-6 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Handoff Preview</h3>
              <button
                onClick={() => setShowHandoffDemo(!showHandoffDemo)}
                className="text-sm text-violet-600 hover:text-violet-700 font-medium"
              >
                {showHandoffDemo ? 'Reset' : 'Simulate Handoff'}
              </button>
            </div>

            {/* Chat simulation */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-4 max-h-[400px] overflow-y-auto">
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 max-w-[80%] shadow-sm border">
                  <p className="text-gray-800">I've been waiting 3 days for my order. This is frustrating!</p>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="bg-violet-500 text-white rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%]">
                  <p>I understand your frustration and I apologize for the delay. Let me connect you with a team member who can help expedite this.</p>
                </div>
              </div>

              {showHandoffDemo && (
                <>
                  {/* Handoff notification */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-center"
                  >
                    <div className="bg-violet-100 text-violet-700 px-4 py-2 rounded-full text-sm flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Transferring to Sarah Chen...
                    </div>
                  </motion.div>

                  {/* Context transfer */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-r from-violet-100 to-purple-100 rounded-xl p-4 border border-violet-200"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowRight className="w-4 h-4 text-violet-600" />
                      <span className="text-sm font-semibold text-violet-700">Context Shared</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-violet-500" />
                        <span className="text-gray-700">Full conversation history</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-violet-500" />
                        <span className="text-gray-700">Customer: John Doe (VIP)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-violet-500" />
                        <span className="text-gray-700">Issue: Order #12345 delayed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-violet-500" />
                        <span className="text-gray-700">Sentiment: Frustrated</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Agent joined */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex justify-center"
                  >
                    <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm flex items-center gap-2">
                      <Headphones className="w-4 h-4" />
                      Sarah Chen joined the chat
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="flex justify-end"
                  >
                    <div className="bg-green-500 text-white rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%]">
                      <p className="text-xs opacity-75 mb-1">Sarah Chen</p>
                      <p>Hi John! I see you've been waiting for order #12345. Let me check on this right now and get you a solution.</p>
                    </div>
                  </motion.div>
                </>
              )}
            </div>

            {/* Features list */}
            <div className="mt-6 space-y-3">
              {[
                { icon: Clock, text: 'Average handoff time: 8 seconds' },
                { icon: MessageCircle, text: 'Full context preserved' },
                { icon: Bell, text: 'Real-time notifications' }
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-gray-600">
                  <feature.icon className="w-4 h-4 text-violet-500" />
                  <span className="text-sm">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HandoffStep;
