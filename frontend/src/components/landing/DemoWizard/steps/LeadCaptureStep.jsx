import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Mail, Phone, Building2, Tag, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDemoWizard } from '../index';

const LEAD_FIELDS = [
  { id: 'name', label: 'Full Name', icon: UserCheck, required: true, enabled: true },
  { id: 'email', label: 'Email Address', icon: Mail, required: true, enabled: true },
  { id: 'phone', label: 'Phone Number', icon: Phone, required: false, enabled: true },
  { id: 'company', label: 'Company Name', icon: Building2, required: false, enabled: false }
];

const QUALIFICATION_RULES = [
  { id: 'budget', label: 'Has budget > $1,000', score: '+20 pts' },
  { id: 'timeline', label: 'Needs solution in 30 days', score: '+15 pts' },
  { id: 'decision', label: 'Is decision maker', score: '+25 pts' }
];

export const LeadCaptureStep = () => {
  const { currentStepData } = useDemoWizard();
  const [fields, setFields] = useState(LEAD_FIELDS);
  const [captureMode, setCaptureMode] = useState('smart'); // 'smart' or 'form'

  const StepIcon = currentStepData.icon;

  const toggleField = (id) => {
    setFields(prev =>
      prev.map(f => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700 mb-4">
          <StepIcon className="w-4 h-4 mr-2" />
          {currentStepData.estimatedTime}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          {currentStepData.title}
        </h2>

        <p className="text-lg text-gray-600 max-w-2xl mx-auto">{currentStepData.description}</p>
      </motion.div>

      {/* Capture Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-100 p-1 rounded-xl inline-flex w-full mb-6"
      >
        <button
          onClick={() => setCaptureMode('smart')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all',
            captureMode === 'smart'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Sparkles className="w-4 h-4" />
          Smart Capture
        </button>
        <button
          onClick={() => setCaptureMode('form')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all',
            captureMode === 'form'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Tag className="w-4 h-4" />
          Form Fields
        </button>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: Configuration */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {captureMode === 'form' ? (
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Lead Form Fields</h3>
              <div className="space-y-3">
                {fields.map((field) => {
                  const FieldIcon = field.icon;
                  return (
                    <div
                      key={field.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border transition-colors',
                        field.enabled ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            field.enabled ? 'bg-orange-100' : 'bg-gray-100'
                          )}
                        >
                          <FieldIcon
                            className={cn('w-4 h-4', field.enabled ? 'text-orange-600' : 'text-gray-400')}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{field.label}</p>
                          {field.required && (
                            <span className="text-xs text-orange-600">Required</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => !field.required && toggleField(field.id)}
                        disabled={field.required}
                        className={cn(
                          'w-10 h-6 rounded-full transition-colors relative',
                          field.enabled ? 'bg-orange-500' : 'bg-gray-300',
                          field.required && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        <div
                          className={cn(
                            'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                            field.enabled ? 'right-1' : 'left-1'
                          )}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">AI-Powered Collection</h3>
              <p className="text-gray-600 mb-4">
                The AI naturally collects information during conversation without interrupting the flow.
              </p>
              <div className="space-y-3">
                {[
                  'Extracts name from greeting',
                  'Captures email when relevant',
                  'Identifies company from context',
                  'Qualifies leads through questions'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-gray-700">
                    <Check className="w-4 h-4 text-orange-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lead Qualification */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Lead Scoring Rules</h3>
            <div className="space-y-3">
              {QUALIFICATION_RULES.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg"
                >
                  <span className="text-gray-700">{rule.label}</span>
                  <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                    {rule.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Column: Preview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-white rounded-xl border p-6 sticky top-4">
            <h3 className="font-semibold text-gray-900 mb-4">Live Preview</h3>

            {/* Chat simulation */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 max-w-[80%] shadow-sm border">
                  <p className="text-gray-800">Hi! I'd love to learn more about your pricing plans.</p>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="bg-orange-500 text-white rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%]">
                  <p>Great question! Before I share our pricing, may I ask what company you're with?</p>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 max-w-[80%] shadow-sm border">
                  <p className="text-gray-800">I'm Sarah from TechCorp. We're looking for a solution for our support team.</p>
                </div>
              </div>

              {/* Captured lead info */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl p-4 border border-orange-200"
              >
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-700">Lead Captured!</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2 text-gray-900">Sarah</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Company:</span>
                    <span className="ml-2 text-gray-900">TechCorp</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Intent:</span>
                    <span className="ml-2 text-gray-900">Pricing</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Score:</span>
                    <span className="ml-2 font-semibold text-orange-600">85/100</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LeadCaptureStep;
