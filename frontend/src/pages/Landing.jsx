import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Shield,
  Clock,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Check,
  Star,
  Globe,
  ChevronDown,
  X,
  Link2,
  Lock,
  Share2,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ROICalculator from '../components/landing/ROICalculator';
import IndustrySolutions from '../components/landing/IndustrySolutions';
import TrustSection from '../components/landing/TrustSection';
import IntegrationsHub from '../components/landing/IntegrationsHub';

const Landing = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const benefits = [
    {
      icon: TrendingDown,
      title: 'Save 80% on Support Costs',
      description: 'Automate responses to common questions and reduce your support team workload dramatically.',
      stat: '80% Cost Reduction',
    },
    {
      icon: Clock,
      title: '24/7 Instant Answers',
      description: 'Never miss a customer query. Your AI assistant works round the clock, delivering instant, accurate responses.',
      stat: 'Under 2s Response',
    },
    {
      icon: Link2,
      title: 'Connect Your Data Sources',
      description: 'Import from Gmail, Notion, Google Drive, Slack, and HubSpot. Your chatbot learns from all your existing knowledge.',
      stat: '5+ Integrations',
    },
    {
      icon: Share2,
      title: 'Share Anywhere',
      description: 'Generate shareable links for your chatbot. Protect with passwords for private access or share publicly.',
      stat: 'Instant Sharing',
    },
    {
      icon: Lock,
      title: 'Password Protection',
      description: 'Control who accesses your chatbot with password-protected links. Perfect for internal teams or premium content.',
      stat: 'Secure Access',
    },
    {
      icon: Globe,
      title: 'Works on Any Website',
      description: 'WordPress, Shopify, custom sites - embed anywhere with a single snippet. Mobile-optimized by default.',
      stat: 'Universal Embed',
    },
  ];

  const pricingTiers = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for testing and small projects',
      features: [
        'Up to 100 messages/month',
        '1 chatbot',
        '10 document uploads',
        'Basic customization',
        'Public share links',
        'Email support',
      ],
      cta: 'Start Free',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'per month',
      description: 'Best for growing businesses',
      features: [
        'Unlimited messages',
        '5 chatbots',
        'Unlimited document uploads',
        'All integrations (Gmail, Notion, Drive, Slack, HubSpot)',
        'Password-protected share links',
        'Full customization',
        'Priority support',
        'Remove Aiden branding',
      ],
      cta: 'Start 14-Day Free Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'contact us',
      description: 'For large organizations',
      features: [
        'Everything in Pro',
        'Unlimited chatbots',
        'Dedicated account manager',
        'Custom integrations',
        'SSO & advanced security',
        'White-label solution',
        'On-premise deployment',
        'Custom AI training',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'CEO',
      company: 'TechFlow Solutions',
      image: 'SC',
      quote: 'Aiden reduced our support tickets by 73% in the first month. Our customers get instant answers, and my team focuses on complex issues. ROI was immediate.',
      rating: 5,
    },
    {
      name: 'Michael Rodriguez',
      role: 'Customer Success Manager',
      company: 'CloudScale Inc',
      image: 'MR',
      quote: 'Setup took literally 5 minutes. The AI is incredibly accurate with our technical documentation. Our CSAT score jumped from 82% to 94%.',
      rating: 5,
    },
    {
      name: 'Emily Watson',
      role: 'Founder',
      company: 'EduLearn Platform',
      image: 'EW',
      quote: 'We went from 2-hour response times to instant answers. Students love it, and we saved $4,500/month on support staff. Best investment we made.',
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: 'How does Aiden work?',
      answer: 'Aiden uses advanced AI with a triple-database RAG system (Vector, Full-text, and Knowledge Graph) to understand your documents deeply. When a customer asks a question, it retrieves the most relevant information and generates accurate, natural responses in seconds.',
    },
    {
      question: 'What integrations do you support?',
      answer: 'Aiden integrates with Gmail, Google Drive, Notion, Slack, and HubSpot. Connect your existing tools to import emails, documents, pages, channel messages, and CRM data directly into your chatbot\'s knowledge base.',
    },
    {
      question: 'Can I share my chatbot with a link?',
      answer: 'Yes! Generate a shareable link for your chatbot that anyone can access. For private chatbots, add password protection so only authorized users can interact with your AI assistant.',
    },
    {
      question: 'What file formats do you support?',
      answer: 'We support PDF, DOCX, TXT, and more. Plus with integrations, you can import content from Gmail, Notion pages, Google Drive files, Slack channels, and HubSpot CRM records.',
    },
    {
      question: 'Can I customize the chatbot appearance?',
      answer: 'Yes! Customize colors, welcome messages, position, avatar, and more to match your brand perfectly. Pro plans allow you to remove Aiden branding entirely.',
    },
    {
      question: 'How does password protection work?',
      answer: 'When sharing your chatbot, you can set a password. Users visiting your share link will need to enter the password to access the chat. Perfect for internal teams, paid content, or private knowledge bases.',
    },
  ];

  const stats = [
    { number: '1,000+', label: 'Businesses Trust Us' },
    { number: '500K+', label: 'Conversations Handled' },
    { number: '95%', label: 'Customer Satisfaction' },
    { number: '2s', label: 'Average Response Time' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-50 border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/25">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">Aiden</span>
            </div>
            <div className="flex items-center space-x-6">
              <a href="#integrations" className="hidden md:block text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Integrations
              </a>
              <a href="#pricing" className="hidden md:block text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Pricing
              </a>
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-lg shadow-blue-600/25 transition-all"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-blue-50 via-white to-white overflow-hidden relative">
        {/* Floating Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -100, 0],
              y: [0, 100, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-40 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12">
            {/* Social Proof Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">Trusted by 1,000+ businesses worldwide</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight"
            >
              Turn Your Docs Into
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 bg-clip-text text-transparent">
                24/7 Support Magic
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              Save 80% on support costs with AI that actually understands your business.
              <span className="font-semibold text-gray-900"> Setup in 5 minutes.</span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
            >
              <Link
                to="/register"
                className="flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-bold text-lg shadow-2xl shadow-blue-600/40 transform hover:scale-105 transition-all"
              >
                Start Free 14-Day Trial <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                to="#demo"
                className="flex items-center px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:border-blue-600 hover:text-blue-600 font-semibold text-lg transition-all"
              >
                Watch Demo
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-sm text-gray-500"
            >
              No credit card required • Cancel anytime • Setup in 5 minutes
            </motion.p>
          </div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 max-w-4xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-1">{stat.number}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Compliance Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="flex justify-center items-center flex-wrap gap-3 sm:gap-4 mb-16 text-xs sm:text-sm text-gray-600"
          >
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
              <span className="font-semibold">SOC 2 Ready</span>
            </div>
            <span className="text-gray-400 hidden sm:inline">•</span>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
              <span className="font-semibold">GDPR Ready</span>
            </div>
            <span className="text-gray-400 hidden sm:inline">•</span>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
              <span className="font-semibold">256-bit Encryption</span>
            </div>
          </motion.div>

          {/* Hero Mockup */}
          <div className="mt-8 sm:mt-16 relative px-2 sm:px-0">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-3xl opacity-20 transform scale-95"></div>
            <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-6 max-w-5xl mx-auto border border-gray-200">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg sm:rounded-xl p-3 sm:p-8 relative overflow-hidden">
                {/* Browser Chrome - Hidden on mobile */}
                <div className="hidden sm:flex items-center space-x-2 mb-6">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex-1 bg-white rounded-md px-4 py-1 text-sm text-gray-500 ml-4">
                    yourwebsite.com
                  </div>
                </div>

                {/* Chatbot Widget Preview */}
                <div className="flex justify-center sm:justify-end">
                  <div className="w-full sm:w-80 md:w-96 bg-white rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl overflow-hidden border border-gray-200">
                    {/* Widget Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 sm:p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-white font-semibold text-sm sm:text-base">Your AI Assistant</div>
                          <div className="text-blue-100 text-xs">Online • Responds instantly</div>
                        </div>
                      </div>
                      <X className="w-4 h-4 sm:w-5 sm:h-5 text-white opacity-75 cursor-pointer" />
                    </div>

                    {/* Chat Messages */}
                    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 h-56 sm:h-72 md:h-80 bg-gray-50 overflow-y-auto">
                      {/* AI Message */}
                      <div className="flex space-x-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                        <div className="bg-white rounded-2xl rounded-tl-sm p-2.5 sm:p-3 shadow-sm max-w-[85%] sm:max-w-xs">
                          <p className="text-xs sm:text-sm text-gray-800">
                            Hi! I'm your AI assistant. How can I help you today?
                          </p>
                        </div>
                      </div>

                      {/* User Message */}
                      <div className="flex justify-end">
                        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm p-2.5 sm:p-3 shadow-sm max-w-[85%] sm:max-w-xs">
                          <p className="text-xs sm:text-sm">What's your refund policy?</p>
                        </div>
                      </div>

                      {/* AI Response */}
                      <div className="flex space-x-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                        <div className="bg-white rounded-2xl rounded-tl-sm p-2.5 sm:p-3 shadow-sm max-w-[85%] sm:max-w-xs">
                          <p className="text-xs sm:text-sm text-gray-800">
                            We offer a 30-day money-back guarantee. Contact support and we'll process your refund in 2-3 days.
                          </p>
                        </div>
                      </div>

                      {/* Typing Indicator */}
                      <div className="flex space-x-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                        <div className="bg-white rounded-2xl rounded-tl-sm p-2.5 sm:p-3 shadow-sm">
                          <div className="flex space-x-1">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Input Field */}
                    <div className="p-3 sm:p-4 border-t border-gray-200 bg-white">
                      <div className="flex items-center space-x-2 bg-gray-100 rounded-lg sm:rounded-xl p-2.5 sm:p-3">
                        <input
                          type="text"
                          placeholder="Ask me anything..."
                          className="flex-1 bg-transparent text-xs sm:text-sm outline-none text-gray-600"
                          disabled
                        />
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                        </div>
                      </div>
                      <p className="text-[10px] sm:text-xs text-gray-400 text-center mt-2">Powered by Aiden</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Businesses Choose Aiden
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real results that impact your bottom line from day one
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                  className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-200 hover:border-blue-300 group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-blue-600/25">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full mb-4">
                    {benefit.stat}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <ROICalculator />

      {/* Industry Solutions Section */}
      <IndustrySolutions />

      {/* Integrations Section - Everything Connected */}
      <IntegrationsHub />

      {/* Trust & Security Section */}
      <TrustSection />

      {/* Pricing Section */}
      <section className="py-20 bg-white" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: tier.highlighted ? 1.02 : 1.05 }}
                className={`rounded-2xl p-8 ${
                  tier.highlighted
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-2xl scale-105 border-4 border-blue-400 relative'
                    : 'bg-white text-gray-900 shadow-lg border border-gray-200'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`text-2xl font-bold mb-2 ${tier.highlighted ? 'text-white' : 'text-gray-900'}`}>
                    {tier.name}
                  </h3>
                  <div className="flex items-baseline mb-2">
                    <span className={`text-5xl font-extrabold ${tier.highlighted ? 'text-white' : 'text-gray-900'}`}>
                      {tier.price}
                    </span>
                    <span className={`ml-2 ${tier.highlighted ? 'text-blue-100' : 'text-gray-500'}`}>
                      /{tier.period}
                    </span>
                  </div>
                  <p className={tier.highlighted ? 'text-blue-100' : 'text-gray-600'}>
                    {tier.description}
                  </p>
                </div>

                <Link
                  to="/register"
                  className={`block w-full py-3 px-6 rounded-xl font-bold text-center mb-6 transition-all ${
                    tier.highlighted
                      ? 'bg-white text-blue-600 hover:bg-gray-100 shadow-lg'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {tier.cta}
                </Link>

                <ul className="space-y-3">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${tier.highlighted ? 'text-blue-200' : 'text-blue-600'}`} />
                      <span className={tier.highlighted ? 'text-blue-50' : 'text-gray-600'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-gray-500 mt-12">
            All plans include SSL encryption, 99.9% uptime, and regular updates
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Loved by Support Teams Everywhere
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Don't just take our word for it - hear from businesses transforming their support
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-200"
              >
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                <p className="text-gray-700 mb-6 leading-relaxed italic">
                  "{testimonial.quote}"
                </p>

                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.image}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">
                      {testimonial.role}, {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about Aiden
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                      openFaq === index ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 bg-grid-pattern"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full mb-6">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-semibold">Limited Time: Get 14 days free on any plan</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Customer Support?
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Join 1,000+ businesses already saving time and money with AI-powered support.
            <br />
            <span className="font-semibold text-white">Start your free trial today - no credit card required.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              to="/register"
              className="flex items-center px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-gray-100 font-bold text-lg shadow-2xl transform hover:scale-105 transition-all"
            >
              Start Free 14-Day Trial <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="flex items-center px-8 py-4 border-2 border-white text-white rounded-xl hover:bg-white/10 font-semibold text-lg transition-all"
            >
              Sign In
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-blue-100 text-sm">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>Setup in 5 minutes</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/25">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Aiden</span>
              </div>
              <p className="text-gray-400 max-w-sm">
                AI-powered chatbots that transform your documentation into 24/7 customer support.
                Save time, reduce costs, delight customers.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#demo" className="text-gray-400 hover:text-white transition-colors">Demo</a></li>
                <li><Link to="/register" className="text-gray-400 hover:text-white transition-colors">Get Started</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#about" className="text-gray-400 hover:text-white transition-colors">About</a></li>
                <li><a href="#contact" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
                <li><a href="#privacy" className="text-gray-400 hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#terms" className="text-gray-400 hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; 2024 ZAIA Systems. All rights reserved. Aiden is a ZAIA product.
            </p>
            <div className="flex items-center space-x-6 text-gray-400 text-sm">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
