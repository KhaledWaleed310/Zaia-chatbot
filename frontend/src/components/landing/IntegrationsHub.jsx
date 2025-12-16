import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Sparkles, Link2, ArrowRight, Clock, Share2, Check, Lock } from 'lucide-react';

// Logo components
const GmailLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-10 md:h-10">
    <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
  </svg>
);

const GoogleDriveLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-10 md:h-10">
    <path fill="#4285F4" d="M12 11L6 21h12z"/>
    <path fill="#FBBC04" d="M6 21l6-10L6 1z"/>
    <path fill="#34A853" d="M18 21l-6-10L6 1h6l6 10z"/>
    <path fill="#EA4335" d="M12 11L6 1h6z"/>
    <path fill="#188038" d="M18 21H6l6-10z"/>
    <path fill="#1967D2" d="M12 11l6 10h-6z"/>
  </svg>
);

const NotionLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-10 md:h-10">
    <path fill="#000" d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933zM2.332 1.155l13.728-.933c1.682-.14 2.102.093 2.802.607l3.876 2.706c.467.327.607.746.607 1.214v14.467c0 .84-.28 1.354-1.308 1.447l-15.457.887c-.747.047-1.12-.093-1.495-.56l-2.428-3.173c-.42-.56-.606-1.026-.606-1.587V2.575c0-.7.28-1.307 1.12-1.42z"/>
  </svg>
);

const SlackLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-10 md:h-10">
    <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
    <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
    <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>
    <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
  </svg>
);

const HubSpotLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-10 md:h-10">
    <path fill="#FF7A59" d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.267-1.984v-.066A2.198 2.198 0 0 0 17.235.838h-.066a2.198 2.198 0 0 0-2.196 2.196v.066c0 .907.55 1.685 1.334 2.02v2.81a6.007 6.007 0 0 0-2.878 1.392l-7.596-5.913A2.535 2.535 0 0 0 5.976.954a2.548 2.548 0 0 0-2.548 2.548c0 1.238.888 2.267 2.06 2.491l-.005 8.064a2.548 2.548 0 0 0 .493 5.043c1.16 0 2.14-.778 2.45-1.84l7.645-5.95a6.026 6.026 0 1 0 2.093-3.38zm-5.862 9.286a3.917 3.917 0 0 1 0-5.542 3.917 3.917 0 0 1 5.542 0 3.917 3.917 0 0 1 0 5.542 3.917 3.917 0 0 1-5.542 0z"/>
  </svg>
);

const integrations = [
  { name: 'Gmail', Logo: GmailLogo, color: '#EA4335', description: 'Emails' },
  { name: 'Google Drive', Logo: GoogleDriveLogo, color: '#4285F4', description: 'Documents' },
  { name: 'Notion', Logo: NotionLogo, color: '#000000', description: 'Pages' },
  { name: 'Slack', Logo: SlackLogo, color: '#4A154B', description: 'Messages' },
  { name: 'HubSpot', Logo: HubSpotLogo, color: '#FF7A59', description: 'CRM Data' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  },
};

const IntegrationsHub = () => {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white overflow-hidden" id="integrations">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6">
            <Link2 className="w-4 h-4" />
            <span className="text-sm font-semibold">Everything Connected</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            One Hub. All Your Knowledge.
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Connect all your tools to Aiden. Your chatbot instantly learns from every source.
          </p>
        </motion.div>

        {/* Main Hub Visualization */}
        <motion.div
          className="relative max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          {/* Desktop: Circular Hub Layout */}
          <div className="hidden md:block relative" style={{ minHeight: '500px' }}>
            {/* Central Aiden Hub */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
              variants={itemVariants}
            >
              {/* Pulsing rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                  className="w-52 h-52 rounded-full border-2 border-blue-400/20"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                  className="w-64 h-64 rounded-full border border-purple-400/15"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                />
              </div>

              {/* Main hub */}
              <motion.div
                className="relative w-36 h-36 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 rounded-3xl flex flex-col items-center justify-center shadow-2xl shadow-blue-600/30"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <MessageSquare className="w-14 h-14 text-white mb-1" />
                <span className="text-white font-bold text-xl">Aiden</span>
                <span className="text-blue-200 text-xs">AI Hub</span>
              </motion.div>
            </motion.div>

            {/* Orbiting Integration Cards */}
            {integrations.map((integration, index) => {
              const LogoComponent = integration.Logo;
              const angle = (index * 72 - 90) * (Math.PI / 180); // Start from top, 72 degrees apart
              const radius = 180; // Distance from center
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <motion.div
                  key={integration.name}
                  className="absolute left-1/2 top-1/2 z-10"
                  style={{
                    x: x - 60, // Center the card (half of card width)
                    y: y - 45, // Center the card (half of card height)
                  }}
                  variants={itemVariants}
                >
                  {/* Connection line */}
                  <svg
                    className="absolute pointer-events-none"
                    style={{
                      width: radius + 60,
                      height: radius + 45,
                      left: x > 0 ? -radius : 60,
                      top: y > 0 ? -radius : 45,
                    }}
                  >
                    <motion.line
                      x1={x > 0 ? radius : 0}
                      y1={y > 0 ? radius : 0}
                      x2={x > 0 ? 0 : radius}
                      y2={y > 0 ? 0 : radius}
                      stroke="url(#gradient)"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.5 }}
                      transition={{ duration: 1, delay: index * 0.2 }}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Integration Card */}
                  <motion.div
                    className="relative bg-white rounded-2xl shadow-lg border border-gray-100 p-4 w-[120px] cursor-pointer"
                    whileHover={{
                      scale: 1.1,
                      boxShadow: "0 20px 40px -12px rgba(0,0,0,0.15)",
                      borderColor: integration.color,
                    }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div
                      className="absolute -inset-1 rounded-2xl blur-xl opacity-0 transition-opacity group-hover:opacity-30"
                      style={{ backgroundColor: integration.color }}
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-14 h-14 flex items-center justify-center bg-gray-50 rounded-xl">
                        <LogoComponent />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-800 text-sm">{integration.name}</p>
                        <p className="text-xs text-gray-500">{integration.description}</p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Mobile: Improved Card Layout */}
          <div className="md:hidden">
            {/* Central Hub - Mobile */}
            <motion.div
              className="flex justify-center mb-8"
              variants={itemVariants}
            >
              <div className="relative">
                {/* Pulsing ring */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  <div className="w-32 h-32 rounded-full border-2 border-blue-400/30" />
                </motion.div>

                <motion.div
                  className="relative w-24 h-24 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 rounded-2xl flex flex-col items-center justify-center shadow-xl shadow-blue-600/30"
                  whileTap={{ scale: 0.95 }}
                >
                  <MessageSquare className="w-10 h-10 text-white mb-1" />
                  <span className="text-white font-bold">Aiden</span>
                </motion.div>
              </div>
            </motion.div>

            {/* Flow indicator */}
            <motion.div
              className="flex justify-center mb-6"
              variants={itemVariants}
            >
              <div className="flex items-center gap-2 text-blue-500">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5 rotate-90" />
                </motion.div>
                <span className="text-sm text-gray-500 font-medium">Connects to</span>
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                >
                  <ArrowRight className="w-5 h-5 rotate-90" />
                </motion.div>
              </div>
            </motion.div>

            {/* Integration Cards - Mobile Grid */}
            <motion.div
              className="grid grid-cols-2 gap-4 px-2"
              variants={containerVariants}
            >
              {integrations.map((integration, index) => {
                const LogoComponent = integration.Logo;
                return (
                  <motion.div
                    key={integration.name}
                    className="relative bg-white rounded-2xl shadow-md border border-gray-100 p-4"
                    variants={itemVariants}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-xl shrink-0"
                        style={{
                          boxShadow: `0 4px 12px -2px ${integration.color}20`
                        }}
                      >
                        <LogoComponent />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{integration.name}</p>
                        <p className="text-xs text-gray-500">{integration.description}</p>
                      </div>
                    </div>
                    {/* Subtle connection indicator */}
                    <div
                      className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full"
                      style={{ backgroundColor: integration.color, opacity: 0.6 }}
                    />
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Result Card - Mobile */}
            <motion.div
              className="mt-8 mx-2"
              variants={itemVariants}
            >
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Smart AI Chatbot</h4>
                    <p className="text-xs text-gray-500">Knows everything from all sources</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 italic bg-white/60 rounded-xl p-3">
                  "I can answer questions using your emails, documents, Notion pages, Slack messages, and CRM data!"
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Coming Soon Badge */}
        <motion.div
          className="text-center mt-12 md:mt-16 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Clock className="w-5 h-5" />
            <span>Integrations Coming Soon</span>
          </motion.div>
          <p className="text-gray-500 mt-3 text-sm max-w-md mx-auto">
            We're working hard to bring you seamless connections to all your favorite tools.
          </p>
        </motion.div>

        {/* Share Feature Highlight */}
        <motion.div
          className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-6 sm:p-8 md:p-12 text-white relative overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />

          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            {/* Left content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-semibold">New Feature</span>
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                Share Your Chatbot Instantly
              </h3>
              <p className="text-blue-100 text-base sm:text-lg mb-6">
                Generate a shareable link for your chatbot in one click. Add password protection for private access, or share publicly with anyone.
              </p>
              <ul className="space-y-3">
                {[
                  'One-click shareable links',
                  'Optional password protection',
                  'Beautiful standalone chat page',
                  'Perfect for teams & clients'
                ].map((feature, i) => (
                  <motion.li
                    key={i}
                    className="flex items-center space-x-3"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  >
                    <div className="w-5 h-5 rounded-full bg-green-400/30 flex items-center justify-center">
                      <Check className="w-3 h-3 text-green-300" />
                    </div>
                    <span className="text-sm sm:text-base">{feature}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Right content - Share preview card */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 20, rotate: 2 }}
              whileInView={{ opacity: 1, x: 0, rotate: 2 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ rotate: 0 }}
            >
              <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Protected Chatbot</div>
                    <div className="text-sm text-gray-500">Enter password to continue</div>
                  </div>
                </div>
                <div className="bg-gray-100 rounded-xl p-4 mb-4">
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-transparent text-gray-600 outline-none"
                    disabled
                  />
                </div>
                <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-sm sm:text-base">
                  Unlock Chat
                </button>
              </div>
              {/* Floating badge */}
              <motion.div
                className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 400, delay: 0.6 }}
              >
                Secure
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default IntegrationsHub;
