import {
  UserPlus,
  Bot,
  Upload,
  Palette,
  Code,
  Monitor,
  ShoppingCart,
  Heart,
  GraduationCap,
  Scale,
  Building2,
  Home,
  Sparkles,
  MessageCircle,
  Plug,
  BarChart3,
  UserCheck,
  Calendar,
  Headphones
} from 'lucide-react';

export const DEMO_WIZARD_STEPS = [
  {
    id: 'signup',
    number: 1,
    name: 'Sign Up',
    title: 'Create Your Account',
    description: 'Get started in seconds with just your email. No credit card required.',
    icon: UserPlus,
    color: 'blue',
    estimatedTime: '30 seconds'
  },
  {
    id: 'create',
    number: 2,
    name: 'Create Bot',
    title: 'Name Your AI Assistant',
    description: 'Choose a name and select your industry for optimized AI responses.',
    icon: Bot,
    color: 'purple',
    estimatedTime: '1 minute'
  },
  {
    id: 'upload',
    number: 3,
    name: 'Train AI',
    title: 'Train with Your Content',
    description: 'Drag and drop PDFs, docs, or paste your website URL. AI learns instantly.',
    icon: Upload,
    color: 'green',
    estimatedTime: '2 minutes'
  },
  {
    id: 'customize',
    number: 4,
    name: 'Customize',
    title: 'Match Your Brand',
    description: 'Pick colors, choose position, and preview your chat widget.',
    icon: Palette,
    color: 'amber',
    estimatedTime: '1 minute'
  },
  {
    id: 'test',
    number: 5,
    name: 'Test Bot',
    title: 'Test Your Chatbot',
    description: 'Try a live conversation with your AI assistant before going live.',
    icon: MessageCircle,
    color: 'cyan',
    estimatedTime: '2 minutes'
  },
  {
    id: 'leads',
    number: 6,
    name: 'Lead Capture',
    title: 'Smart Lead Capture',
    description: 'Automatically collect visitor information and qualify leads through conversation.',
    icon: UserCheck,
    color: 'orange',
    estimatedTime: '1 minute'
  },
  {
    id: 'booking',
    number: 7,
    name: 'Booking',
    title: 'Booking System',
    description: 'Let customers book appointments, demos, or reservations directly in chat.',
    icon: Calendar,
    color: 'pink',
    estimatedTime: '1 minute'
  },
  {
    id: 'handoff',
    number: 8,
    name: 'Handoff',
    title: 'Human Handoff',
    description: 'Seamlessly transfer complex conversations to your team with full context.',
    icon: Headphones,
    color: 'violet',
    estimatedTime: '1 minute'
  },
  {
    id: 'integrations',
    number: 9,
    name: 'Connect',
    title: 'Connect Your Tools',
    description: 'Integrate with your favorite tools - CRM, Slack, WhatsApp, and more.',
    icon: Plug,
    color: 'indigo',
    estimatedTime: '2 minutes'
  },
  {
    id: 'analytics',
    number: 10,
    name: 'Analytics',
    title: 'Track Performance',
    description: 'Monitor conversations, satisfaction scores, and ROI in real-time.',
    icon: BarChart3,
    color: 'rose',
    estimatedTime: '1 minute'
  },
  {
    id: 'embed',
    number: 11,
    name: 'Go Live',
    title: 'Embed & Launch',
    description: 'Copy one line of code and add 24/7 AI support to your website.',
    icon: Code,
    color: 'emerald',
    estimatedTime: '30 seconds'
  }
];

export const DEMO_INDUSTRIES = [
  { id: 'saas', name: 'SaaS / Software', Icon: Monitor },
  { id: 'ecommerce', name: 'E-commerce', Icon: ShoppingCart },
  { id: 'healthcare', name: 'Healthcare', Icon: Heart },
  { id: 'education', name: 'Education', Icon: GraduationCap },
  { id: 'legal', name: 'Legal Services', Icon: Scale },
  { id: 'finance', name: 'Finance', Icon: Building2 },
  { id: 'realestate', name: 'Real Estate', Icon: Home },
  { id: 'other', name: 'Other', Icon: Sparkles }
];

export const COLOR_PRESETS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Black', value: '#000000' }
];

export const INITIAL_DEMO_STATE = {
  currentStep: 0,
  direction: 1,
  demoData: {
    email: '',
    chatbotName: '',
    industry: null,
    uploadedFiles: [],
    primaryColor: '#3B82F6',
    position: 'bottom-right'
  }
};
