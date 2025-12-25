import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  Rocket,
  PartyPopper,
  ExternalLink,
  Code,
  Link2,
  Globe,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useDemoWizard } from '../index';

export const EmbedStep = () => {
  const { demoData, currentStepData, onClose } = useDemoWizard();
  const [activeTab, setActiveTab] = useState('embed'); // 'embed' or 'share'
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const botId = 'your-bot-id';
  const shareLink = `https://aidenlink.cloud/chat/${botId}`;

  const embedCode = `<!-- Aiden Chatbot Widget -->
<script
  src="https://aidenlink.cloud/widget/zaia-chat.js"
  data-bot-id="${botId}">
</script>`;

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const StepIcon = currentStepData.icon;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
        >
          <PartyPopper className="w-10 h-10 text-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 mb-4">
            <StepIcon className="w-4 h-4 mr-2" />
            {currentStepData.estimatedTime}
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            You're Ready to Go Live!
          </h2>

          <p className="text-lg text-gray-600">
            Choose how you want to share your AI assistant with the world.
          </p>
        </motion.div>
      </div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-100 p-1 rounded-xl inline-flex w-full mb-6"
      >
        <button
          onClick={() => setActiveTab('embed')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all',
            activeTab === 'embed'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Code className="w-4 h-4" />
          Embed Code
        </button>
        <button
          onClick={() => setActiveTab('share')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all',
            activeTab === 'share'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Link2 className="w-4 h-4" />
          Shareable Link
        </button>
      </motion.div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'embed' ? (
          /* Embed Code Tab */
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Website Widget</h3>
                  <p className="text-sm text-gray-500">
                    Add this code before the closing &lt;/body&gt; tag
                  </p>
                </div>
                <button
                  onClick={handleCopyEmbed}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-100">
                  <code>{embedCode}</code>
                </pre>
              </div>
            </div>

            {/* Platform Quick Setup */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Setup Guides</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: 'WordPress', icon: 'W', color: 'bg-blue-500' },
                  { name: 'Shopify', icon: 'S', color: 'bg-green-500' },
                  { name: 'Wix', icon: 'W', color: 'bg-purple-500' }
                ].map((platform) => (
                  <button
                    key={platform.name}
                    className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-center"
                  >
                    <div
                      className={`w-10 h-10 ${platform.color} rounded-lg flex items-center justify-center mx-auto mb-2 text-white font-bold`}
                    >
                      {platform.icon}
                    </div>
                    <p className="text-sm font-medium text-gray-700">{platform.name}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Shareable Link Tab */
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Public Access</h3>
                    <p className="text-sm text-gray-500">Allow anyone with the link to chat</p>
                  </div>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              {isPublic && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4"
                >
                  {/* Share Link */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Share Link
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center bg-gray-100 rounded-lg px-4 py-3 border">
                        <Link2 className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                        <span className="text-gray-700 truncate text-sm">{shareLink}</span>
                      </div>
                      <Button onClick={handleCopyLink} variant="outline" className="px-4">
                        {linkCopied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button variant="outline" className="px-4" asChild>
                        <a href={shareLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Password Protection */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Lock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">Password Protection</h4>
                          <p className="text-sm text-gray-500">Require password to access</p>
                        </div>
                      </div>
                      <Switch checked={hasPassword} onCheckedChange={setHasPassword} />
                    </div>

                    {hasPassword && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative"
                      >
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter password"
                          className="pr-10"
                          defaultValue="demo123"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {!isPublic && (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-500 text-sm">
                    Enable public access to generate a shareable link
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
      >
        <Button size="lg" className="h-14 px-8 text-base" asChild>
          <Link to="/register" onClick={onClose}>
            <Rocket className="w-5 h-5 mr-2" />
            Start Your Free Trial
          </Link>
        </Button>
        <Button size="lg" variant="outline" className="h-14 px-8 text-base" asChild>
          <a href="mailto:sales@aidenlink.cloud">
            <ExternalLink className="w-5 h-5 mr-2" />
            Schedule Demo Call
          </a>
        </Button>
      </motion.div>

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-gray-500"
      >
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <span>14-day free trial</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <span>No credit card</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <span>Cancel anytime</span>
        </div>
      </motion.div>
    </div>
  );
};

export default EmbedStep;
