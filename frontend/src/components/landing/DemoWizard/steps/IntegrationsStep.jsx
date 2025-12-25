import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ExternalLink, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDemoWizard } from '../index';

const INTEGRATIONS = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notified of conversations in Slack',
    icon: '💬',
    category: 'Communication',
    popular: true
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Connect your WhatsApp Business account',
    icon: '📱',
    category: 'Communication',
    popular: true
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Sync leads and contacts automatically',
    icon: '🧡',
    category: 'CRM',
    popular: true
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Push qualified leads to Salesforce',
    icon: '☁️',
    category: 'CRM',
    popular: false
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect 5000+ apps via Zapier',
    icon: '⚡',
    category: 'Automation',
    popular: true
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync bookings with your calendar',
    icon: '📅',
    category: 'Productivity',
    popular: false
  },
  {
    id: 'messenger',
    name: 'Facebook Messenger',
    description: 'Chat with customers on Messenger',
    icon: '💙',
    category: 'Communication',
    popular: false
  },
  {
    id: 'webhook',
    name: 'Webhooks',
    description: 'Send data to any custom endpoint',
    icon: '🔗',
    category: 'Developer',
    popular: false
  }
];

export const IntegrationsStep = () => {
  const { currentStepData } = useDemoWizard();
  const [connectedApps, setConnectedApps] = useState(['slack', 'hubspot']);

  const StepIcon = currentStepData.icon;

  const toggleConnection = (id) => {
    setConnectedApps(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const popularIntegrations = INTEGRATIONS.filter(i => i.popular);
  const otherIntegrations = INTEGRATIONS.filter(i => !i.popular);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700 mb-4">
          <StepIcon className="w-4 h-4 mr-2" />
          {currentStepData.estimatedTime}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          {currentStepData.title}
        </h2>

        <p className="text-lg text-gray-600 max-w-2xl mx-auto">{currentStepData.description}</p>
      </motion.div>

      {/* Popular Integrations */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          Popular Integrations
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {popularIntegrations.map((integration, index) => (
            <motion.button
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toggleConnection(integration.id)}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all relative',
                connectedApps.includes(integration.id)
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              {connectedApps.includes(integration.id) && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="text-3xl mb-2">{integration.icon}</div>
              <p className="font-semibold text-gray-900">{integration.name}</p>
              <p className="text-sm text-gray-500">{integration.description}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Other Integrations */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          More Integrations
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {otherIntegrations.map((integration, index) => (
            <motion.button
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              onClick={() => toggleConnection(integration.id)}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all relative',
                connectedApps.includes(integration.id)
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              {connectedApps.includes(integration.id) && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="text-3xl mb-2">{integration.icon}</div>
              <p className="font-semibold text-gray-900">{integration.name}</p>
              <p className="text-sm text-gray-500">{integration.description}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Connected Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
              <StepIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{connectedApps.length} integrations connected</p>
              <p className="text-sm text-gray-600">You can add more integrations anytime</p>
            </div>
          </div>
          <a href="#" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1">
            View all 50+ integrations
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default IntegrationsStep;
