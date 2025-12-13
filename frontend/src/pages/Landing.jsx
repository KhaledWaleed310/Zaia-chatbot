import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Zap,
  Shield,
  Clock,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Check,
  Star,
  Users,
  Globe,
  BarChart3,
  ChevronDown,
  X,
  Link2,
  Lock,
  Mail,
  FileText,
  Database,
  Share2,
} from 'lucide-react';
import { useState } from 'react';

// SVG Logo Components for Integrations
const GoogleDriveLogo = () => (
  <svg viewBox="0 0 87.3 78" className="w-8 h-8">
    <path d="M6.6 66.85L3.3 61.45 29.05 17.5h6.6l25.75 43.95-3.3 5.4H6.6z" fill="#0066DA"/>
    <path d="M58.1 66.85l-3.3-5.4 25.75-43.95h6.6l3.3 5.4L64.7 66.85h-6.6z" fill="#00AC47"/>
    <path d="M29.05 17.5L54.8 61.45l-3.3 5.4H6.6l3.3-5.4 19.15-43.95z" fill="#EA4335"/>
    <path d="M83.15 22.9L58.1 66.85h-6.6L77.25 22.9h5.9z" fill="#00832D"/>
    <path d="M29.05 17.5h6.6l25.75 43.95h-6.6L29.05 17.5z" fill="#2684FC"/>
    <path d="M35.65 17.5L9.9 61.45l-3.3 5.4 3.3 5.4h45.2l3.3-5.4-25.75-43.95z" fill="#FFBA00"/>
  </svg>
);

const GmailLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8">
    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
  </svg>
);

const NotionLogo = () => (
  <svg viewBox="0 0 100 100" className="w-8 h-8">
    <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" fill="#fff"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z" fill="#000"/>
  </svg>
);

const SlackLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
    <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
    <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
    <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
  </svg>
);

const HubSpotLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8">
    <path d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.267-1.984v-.066A2.2 2.2 0 0 0 17.23.836h-.065a2.2 2.2 0 0 0-2.199 2.198v.066c0 .87.507 1.617 1.24 1.974v2.862a6.22 6.22 0 0 0-2.924 1.453l-7.44-5.79a2.691 2.691 0 0 0 .089-.663 2.69 2.69 0 1 0-2.69 2.69c.474 0 .918-.124 1.305-.34l7.299 5.678a6.242 6.242 0 0 0-.627 2.73c0 1.044.256 2.028.708 2.895l-2.264 2.264a2.048 2.048 0 0 0-.621-.098 2.065 2.065 0 1 0 2.065 2.065c0-.22-.036-.432-.099-.632l2.223-2.222a6.24 6.24 0 0 0 3.396 1.003c3.456 0 6.258-2.802 6.258-6.258s-2.802-6.258-6.258-6.258a6.22 6.22 0 0 0-2.66.593zm2.66 9.802a3.545 3.545 0 1 1 0-7.09 3.545 3.545 0 0 1 0 7.09z" fill="#FF7A59"/>
  </svg>
);

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

  const integrations = [
    { name: 'Google Drive', Logo: GoogleDriveLogo, color: '#4285F4', description: 'Documents & files' },
    { name: 'Gmail', Logo: GmailLogo, color: '#EA4335', description: 'Email conversations' },
    { name: 'Notion', Logo: NotionLogo, color: '#000000', description: 'Pages & databases' },
    { name: 'Slack', Logo: SlackLogo, color: '#4A154B', description: 'Channel messages' },
    { name: 'HubSpot', Logo: HubSpotLogo, color: '#FF7A59', description: 'CRM data' },
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
      <section className="pt-32 pb-20 bg-gradient-to-b from-blue-50 via-white to-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            {/* Social Proof Badge */}
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6 animate-pulse">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">Trusted by 1,000+ businesses worldwide</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
              Turn Your Docs Into
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 bg-clip-text text-transparent">
                24/7 Support Magic
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              Save 80% on support costs with AI that actually understands your business.
              <span className="font-semibold text-gray-900"> Setup in 5 minutes.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
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
            </div>

            <p className="text-sm text-gray-500">
              No credit card required • Cancel anytime • Setup in 5 minutes
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-1">{stat.number}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Hero Mockup */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-3xl opacity-20 transform scale-95"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-5xl mx-auto border border-gray-200">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 relative overflow-hidden">
                {/* Browser Chrome */}
                <div className="flex items-center space-x-2 mb-6">
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
                <div className="flex justify-end">
                  <div className="w-96 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                    {/* Widget Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                          <MessageSquare className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-white font-semibold">Your AI Assistant</div>
                          <div className="text-blue-100 text-xs">Online • Responds instantly</div>
                        </div>
                      </div>
                      <X className="w-5 h-5 text-white opacity-75 cursor-pointer" />
                    </div>

                    {/* Chat Messages */}
                    <div className="p-4 space-y-4 h-80 bg-gray-50 overflow-y-auto">
                      {/* AI Message */}
                      <div className="flex space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm max-w-xs">
                          <p className="text-sm text-gray-800">
                            Hi! I'm your AI assistant. I can help you with questions about our products, pricing, and policies. What would you like to know?
                          </p>
                        </div>
                      </div>

                      {/* User Message */}
                      <div className="flex justify-end">
                        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm p-3 shadow-sm max-w-xs">
                          <p className="text-sm">What's your refund policy?</p>
                        </div>
                      </div>

                      {/* AI Response */}
                      <div className="flex space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm max-w-xs">
                          <p className="text-sm text-gray-800">
                            We offer a 30-day money-back guarantee on all purchases. Simply contact our support team, and we'll process your refund within 2-3 business days.
                          </p>
                        </div>
                      </div>

                      {/* Typing Indicator */}
                      <div className="flex space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Input Field */}
                    <div className="p-4 border-t border-gray-200 bg-white">
                      <div className="flex items-center space-x-2 bg-gray-100 rounded-xl p-3">
                        <input
                          type="text"
                          placeholder="Ask me anything..."
                          className="flex-1 bg-transparent text-sm outline-none text-gray-600"
                          disabled
                        />
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                          <ArrowRight className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 text-center mt-2">Powered by Aiden</p>
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
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Businesses Choose Aiden
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real results that impact your bottom line from day one
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={index}
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
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Integrations Section - Everything Connected */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white overflow-hidden" id="integrations">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6">
              <Link2 className="w-4 h-4" />
              <span className="text-sm font-semibold">Everything Connected</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              One Hub. All Your Knowledge.
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Connect all your tools to Aiden. Your chatbot instantly learns from every source, creating one unified AI assistant.
            </p>
          </div>

          {/* Connected Hub Visualization */}
          <div className="relative max-w-4xl mx-auto mb-16">
            {/* Connection Lines SVG - Desktop */}
            <svg className="absolute inset-0 w-full h-full hidden md:block" style={{ zIndex: 0 }}>
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              {/* Animated connection lines from center to each integration */}
              <line x1="50%" y1="50%" x2="10%" y2="20%" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="8,4" className="animate-pulse" />
              <line x1="50%" y1="50%" x2="30%" y2="15%" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="8,4" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
              <line x1="50%" y1="50%" x2="50%" y2="10%" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="8,4" className="animate-pulse" style={{ animationDelay: '0.4s' }} />
              <line x1="50%" y1="50%" x2="70%" y2="15%" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="8,4" className="animate-pulse" style={{ animationDelay: '0.6s' }} />
              <line x1="50%" y1="50%" x2="90%" y2="20%" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="8,4" className="animate-pulse" style={{ animationDelay: '0.8s' }} />
            </svg>

            {/* Integration Icons in Arc - Desktop */}
            <div className="hidden md:flex justify-center items-end gap-8 mb-8 relative" style={{ zIndex: 1 }}>
              {integrations.map((integration, index) => {
                const LogoComponent = integration.Logo;
                const positions = [
                  'translate-y-8',
                  'translate-y-4',
                  'translate-y-0',
                  'translate-y-4',
                  'translate-y-8',
                ];
                return (
                  <div
                    key={index}
                    className={`relative group ${positions[index]}`}
                  >
                    {/* Glowing ring */}
                    <div
                      className="absolute inset-0 rounded-2xl blur-xl opacity-40 group-hover:opacity-70 transition-opacity"
                      style={{ backgroundColor: integration.color }}
                    />
                    <div
                      className="relative w-20 h-20 rounded-2xl flex items-center justify-center bg-white shadow-xl border-2 border-gray-100 group-hover:scale-110 group-hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <LogoComponent />
                    </div>
                    <p className="text-center mt-3 font-semibold text-gray-700 text-sm">{integration.name}</p>
                  </div>
                );
              })}
            </div>

            {/* Mobile Grid Layout */}
            <div className="grid grid-cols-3 gap-4 mb-8 md:hidden">
              {integrations.map((integration, index) => {
                const LogoComponent = integration.Logo;
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center bg-white shadow-lg border border-gray-200"
                    >
                      <LogoComponent />
                    </div>
                    <p className="text-center mt-2 font-medium text-gray-700 text-xs">{integration.name}</p>
                  </div>
                );
              })}
            </div>

            {/* Animated Flow Lines */}
            <div className="flex justify-center mb-6">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 text-blue-500 animate-bounce">
                  <svg className="w-6 h-6 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <svg className="w-6 h-6 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <svg className="w-6 h-6 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <span className="text-sm text-gray-500 mt-1">Data flows into</span>
              </div>
            </div>

            {/* Central Aiden Hub */}
            <div className="flex justify-center relative" style={{ zIndex: 1 }}>
              <div className="relative">
                {/* Pulsing rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full border-2 border-blue-400/30 animate-ping" style={{ animationDuration: '2s' }} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full border border-purple-400/20 animate-ping" style={{ animationDuration: '3s' }} />
                </div>

                {/* Main hub */}
                <div className="relative w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 rounded-3xl flex flex-col items-center justify-center shadow-2xl shadow-blue-600/40 transform hover:scale-105 transition-all">
                  <MessageSquare className="w-12 h-12 md:w-16 md:h-16 text-white mb-2" />
                  <span className="text-white font-bold text-lg md:text-xl">Aiden</span>
                  <span className="text-blue-200 text-xs">AI Hub</span>
                </div>
              </div>
            </div>

            {/* Output Arrow */}
            <div className="flex justify-center mt-6 mb-4">
              <div className="flex flex-col items-center">
                <span className="text-sm text-gray-500 mb-1">Powers your</span>
                <div className="flex items-center gap-2 text-green-500 animate-bounce" style={{ animationDelay: '0.5s' }}>
                  <svg className="w-6 h-6 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <svg className="w-6 h-6 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <svg className="w-6 h-6 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Smart Chatbot Output */}
            <div className="flex justify-center">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Smart AI Chatbot</h4>
                    <p className="text-xs text-gray-500">Knows everything from all sources</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 italic">"I can answer questions using your emails, documents, Notion pages, Slack messages, and CRM data - all in one place!"</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon Badge */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg">
              <Clock className="w-5 h-5" />
              <span>Integrations Coming Soon</span>
            </div>
            <p className="text-gray-500 mt-3 text-sm">We're working hard to bring you seamless connections to all your favorite tools.</p>
          </div>

          {/* Share Feature Highlight */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-full mb-6">
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">New Feature</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-4">
                  Share Your Chatbot Instantly
                </h3>
                <p className="text-blue-100 text-lg mb-6">
                  Generate a shareable link for your chatbot in one click. Add password protection for private access, or share publicly with anyone.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-300" />
                    <span>One-click shareable links</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-300" />
                    <span>Optional password protection</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-300" />
                    <span>Beautiful standalone chat page</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-300" />
                    <span>Perfect for teams & clients</span>
                  </li>
                </ul>
              </div>
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-transform">
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
                  <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold">
                    Unlock Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <div
                key={index}
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
              </div>
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
