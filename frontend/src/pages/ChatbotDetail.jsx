import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import IntegrationCard from '../components/IntegrationCard';
import FileBrowser from '../components/FileBrowser';
import { chatbots, integrations, leads, handoff, translation } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare,
  Upload,
  Trash2,
  Code,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  Link2,
  Share2,
  Lock,
  Unlock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  BarChart3,
  Users,
  Phone,
  Globe,
  Calendar,
  ShoppingBag,
  Headphones,
  CalendarCheck,
  UserPlus,
  HelpCircle,
  Wrench,
  Home,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

// Pre-made prompt templates for different use cases
const PROMPT_TEMPLATES = [
  {
    id: 'sales',
    name: 'Sales Assistant',
    icon: ShoppingBag,
    color: 'emerald',
    description: 'Convert leads & close deals',
    prompt: `You are Aiden, a professional and persuasive sales assistant. Your goal is to help potential customers understand our products/services and guide them toward making a purchase.

## Your Approach:
- Be friendly, enthusiastic, and genuinely helpful
- Ask qualifying questions to understand customer needs
- Highlight benefits and value, not just features
- Address objections with empathy and facts
- Create urgency without being pushy
- Always offer to schedule a call or demo for complex inquiries

## Guidelines:
- If asked about pricing, provide information if available, or offer to connect them with the sales team
- For technical questions you can't answer, collect their contact info and promise a follow-up
- End conversations with a clear next step (book a demo, sign up, contact sales)
- Be honest - never make promises you can't keep

## When collecting booking/meeting requests:
Ask for: Full name, phone/WhatsApp number, preferred date and time, and what they'd like to discuss.`
  },
  {
    id: 'support',
    name: 'Customer Support',
    icon: Headphones,
    color: 'blue',
    description: 'Help & resolve issues',
    prompt: `You are Aiden, a friendly and empathetic customer support specialist. Your mission is to help customers resolve their issues quickly and leave them feeling valued.

## Your Approach:
- Start by acknowledging the customer's concern
- Ask clarifying questions to fully understand the issue
- Provide clear, step-by-step solutions when possible
- Be patient and never make customers feel rushed
- Apologize sincerely when things go wrong (even if it's not your fault)

## Guidelines:
- Always check the knowledge base before saying you don't know
- For issues you can't resolve, offer to escalate to a human agent
- Follow up to ensure the solution worked
- Thank customers for their patience and feedback
- Keep responses concise but complete

## Escalation Triggers:
- Billing disputes or refund requests over standard amounts
- Technical issues requiring backend access
- Complaints about staff or serious service failures
- When the customer explicitly asks for a human`
  },
  {
    id: 'booking',
    name: 'Reservations',
    icon: CalendarCheck,
    color: 'amber',
    description: 'Handle appointments & bookings',
    prompt: `You are Aiden, a helpful reservations assistant. Your job is to make booking appointments, tables, or services as smooth and pleasant as possible.

## Your Approach:
- Be warm and welcoming
- Guide customers through the booking process step by step
- Confirm all details before finalizing
- Offer alternatives if the requested time isn't available
- Send clear confirmation of booking details

## Information to Collect:
1. Full name of the person booking
2. Phone or WhatsApp number for confirmation
3. Preferred date and time
4. Number of people/guests (if applicable)
5. Any special requests or requirements

## Guidelines:
- Always repeat back the booking details for confirmation
- Mention cancellation/rescheduling policies if relevant
- Suggest optimal times if the customer is flexible
- For group bookings, ask about special occasions
- End with a friendly confirmation and what to expect next`
  },
  {
    id: 'lead-gen',
    name: 'Lead Generation',
    icon: UserPlus,
    color: 'violet',
    description: 'Qualify & capture leads',
    prompt: `You are Aiden, a conversational lead qualification specialist. Your goal is to engage website visitors, understand their needs, and collect their information for follow-up.

## Your Approach:
- Start with a friendly, open-ended question about what they're looking for
- Listen actively and ask relevant follow-up questions
- Naturally weave in qualification questions
- Position the value of speaking with our team
- Make leaving contact information feel beneficial, not obligatory

## Qualification Questions to Weave In:
- What challenge are they trying to solve?
- What's their timeline for making a decision?
- Have they tried other solutions?
- What's their role in the decision-making process?
- What would success look like for them?

## Information to Collect:
- Name and company (if B2B)
- Email and/or phone number
- Their primary interest or need
- Best time to reach them

## Guidelines:
- Don't interrogate - have a natural conversation
- Offer something valuable (demo, consultation, resource) in exchange for contact info
- If they're not ready to share info, that's okay - be helpful anyway`
  },
  {
    id: 'faq',
    name: 'FAQ Assistant',
    icon: HelpCircle,
    color: 'cyan',
    description: 'Answer common questions',
    prompt: `You are Aiden, a knowledgeable FAQ assistant. Your job is to provide quick, accurate answers to common questions using the information in your knowledge base.

## Your Approach:
- Give direct, concise answers first
- Provide additional context if helpful
- Use bullet points and formatting for clarity
- Anticipate follow-up questions and address them proactively
- Admit when you don't have information rather than guessing

## Guidelines:
- Always base answers on your knowledge base - don't make things up
- If a question isn't in your knowledge base, say so clearly and offer alternatives
- For complex topics, break down the answer into digestible parts
- Link to relevant resources or pages when available
- If the same question could have multiple interpretations, ask for clarification

## When You Can't Answer:
- Acknowledge the limitation honestly
- Suggest contacting support for more specific help
- Offer to help with something else`
  },
  {
    id: 'tech-support',
    name: 'Technical Support',
    icon: Wrench,
    color: 'orange',
    description: 'Troubleshoot tech issues',
    prompt: `You are Aiden, a patient and knowledgeable technical support specialist. Your goal is to help users resolve technical issues through clear, step-by-step guidance.

## Your Approach:
- Start by understanding the exact problem and when it started
- Ask about what they've already tried
- Provide solutions in order from simplest to most complex
- Use numbered steps for clarity
- Verify each step worked before moving to the next

## Troubleshooting Framework:
1. Identify the problem clearly
2. Gather relevant information (device, browser, error messages)
3. Start with common quick fixes
4. Escalate complexity gradually
5. Document what worked for future reference

## Guidelines:
- Never assume technical knowledge - explain things simply
- Use screenshots or examples when helpful
- If a solution requires technical risk, warn them first
- For issues beyond your scope, escalate to human support
- Always confirm the issue is resolved before closing

## Information to Gather:
- What device/browser/app are they using?
- What were they trying to do when the issue occurred?
- Any error messages (exact wording)?
- Has this happened before?`
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    icon: Home,
    color: 'rose',
    description: 'Property inquiries & viewings',
    prompt: `You are Aiden, a helpful real estate assistant. Your job is to answer property inquiries and schedule viewings for interested buyers or renters.

## Your Approach:
- Be enthusiastic about properties without overselling
- Ask about their requirements to match them with suitable listings
- Provide detailed information about properties, neighborhoods, and amenities
- Schedule viewings efficiently
- Follow up on their level of interest

## Key Questions to Ask:
- Are they looking to buy or rent?
- What's their budget range?
- Preferred location/neighborhood?
- How many bedrooms/bathrooms needed?
- Any must-have features (parking, garden, elevator)?
- What's their timeline for moving?

## For Viewing Requests:
Collect: Full name, phone number, preferred date/time, which property they want to view

## Guidelines:
- Highlight unique selling points of each property
- Be honest about property limitations if asked
- Offer virtual tours if available
- Suggest similar properties if their first choice isn't suitable
- Provide neighborhood information (schools, transport, amenities)`
  },
  {
    id: 'education',
    name: 'Education & Courses',
    icon: GraduationCap,
    color: 'indigo',
    description: 'Course info & enrollment',
    prompt: `You are Aiden, an educational advisor assistant. Your role is to help prospective students learn about courses, programs, and guide them through enrollment.

## Your Approach:
- Understand their educational goals and background
- Match them with suitable courses or programs
- Explain curriculum, duration, fees, and outcomes clearly
- Guide them through the application/enrollment process
- Address concerns about prerequisites or time commitment

## Key Questions:
- What subject or skill are they interested in?
- What's their current education/experience level?
- Are they looking for full-time, part-time, or self-paced?
- What's their goal (career change, skill upgrade, certification)?
- Do they have any schedule constraints?

## Information to Provide:
- Course content and learning outcomes
- Duration and schedule options
- Fees and payment plans
- Prerequisites if any
- Career opportunities after completion

## For Enrollment:
Collect: Full name, email, phone, course of interest, preferred start date

## Guidelines:
- Be encouraging but realistic about course requirements
- Suggest preparatory resources if they need them
- Explain the enrollment deadline and process clearly
- Offer to connect them with admissions for complex questions`
  }
];

const getTemplateColorClasses = (color) => {
  const colors = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', hover: 'hover:border-emerald-400', selectedBg: 'bg-emerald-100' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', hover: 'hover:border-blue-400', selectedBg: 'bg-blue-100' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600', hover: 'hover:border-amber-400', selectedBg: 'bg-amber-100' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'bg-violet-100 text-violet-600', hover: 'hover:border-violet-400', selectedBg: 'bg-violet-100' },
    cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'bg-cyan-100 text-cyan-600', hover: 'hover:border-cyan-400', selectedBg: 'bg-cyan-100' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-600', hover: 'hover:border-orange-400', selectedBg: 'bg-orange-100' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'bg-rose-100 text-rose-600', hover: 'hover:border-rose-400', selectedBg: 'bg-rose-100' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-600', hover: 'hover:border-indigo-400', selectedBg: 'bg-indigo-100' },
  };
  return colors[color] || colors.blue;
};

// Template Selector Dropdown Component
const TemplateSelector = ({ templates, onSelect, getColorClasses }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (template) => {
    setSelected(template);
    onSelect(template);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
      >
        {selected ? (
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${getColorClasses(selected.color).icon}`}>
              <selected.icon className="w-4 h-4" />
            </div>
            <span className="font-medium text-gray-900">{selected.name}</span>
            <span className="text-sm text-gray-500">— {selected.description}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <Sparkles className="w-4 h-4" />
            <span>Choose a template to get started...</span>
          </div>
        )}
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {templates.map((template) => {
              const colors = getColorClasses(template.color);
              const IconComponent = template.icon;
              const isSelected = selected?.id === template.id;
              return (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                    isSelected ? colors.selectedBg : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${colors.icon}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-sm text-gray-500 truncate">{template.description}</p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const PROVIDERS = ['google_drive', 'gmail', 'notion', 'slack', 'hubspot'];
const PROVIDER_NAMES = {
  google_drive: 'Google Drive',
  gmail: 'Gmail',
  notion: 'Notion',
  slack: 'Slack',
  hubspot: 'HubSpot',
};

const ChatbotDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const [bot, setBot] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [embedCode, setEmbedCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'settings');
  const [copied, setCopied] = useState(false);

  // Integrations state
  const [integrationsData, setIntegrationsData] = useState([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState(null);
  const [browsingProvider, setBrowsingProvider] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);

  // Share state
  const [isPublic, setIsPublic] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingShare, setSavingShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Feature toggles state
  const [leadFormEnabled, setLeadFormEnabled] = useState(false);
  const [handoffEnabled, setHandoffEnabled] = useState(false);
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [bookingPrompt, setBookingPrompt] = useState('');
  const [multiLanguageEnabled, setMultiLanguageEnabled] = useState(false);
  const [isPersonal, setIsPersonal] = useState(false);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [savingBookingPrompt, setSavingBookingPrompt] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    system_prompt: '',
    welcome_message: '',
    primary_color: '#3B82F6',
    text_color: '#FFFFFF',
    position: 'bottom-right',
  });

  // Get company name from user profile or bot name as fallback
  const companyName = user?.company_name || bot?.name || 'Your Company';

  // Function to customize prompt template with company name
  const customizePrompt = (promptTemplate) => {
    return promptTemplate
      .replace(/\[Company Name\]/g, companyName)
      .replace(/\[company name\]/g, companyName)
      .replace(/our products\/services/g, `${companyName}'s products/services`)
      .replace(/our team/g, `the ${companyName} team`);
  };

  useEffect(() => {
    loadChatbot();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'integrations') {
      loadIntegrations();
    }
  }, [activeTab, id]);

  // Check for OAuth callback success
  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected) {
      setActiveTab('integrations');
      loadIntegrations();
    }
  }, [searchParams]);

  const loadChatbot = async () => {
    try {
      const [botRes, docsRes, embedRes, leadConfigRes, handoffConfigRes, bookingConfigRes, langConfigRes] = await Promise.all([
        chatbots.get(id),
        chatbots.listDocuments(id),
        chatbots.getEmbed(id),
        leads.getFormConfig(id).catch(() => ({ data: { enabled: false } })),
        handoff.getConfig(id).catch(() => ({ data: { enabled: false } })),
        handoff.getBookingConfig(id).catch(() => ({ data: { enabled: false } })),
        translation.getConfig(id).catch(() => ({ data: { enabled: false } })),
      ]);

      setBot(botRes.data);
      setDocuments(docsRes.data);
      setEmbedCode(embedRes.data);

      setFormData({
        name: botRes.data.name,
        system_prompt: botRes.data.system_prompt || '',
        welcome_message: botRes.data.welcome_message || '',
        primary_color: botRes.data.primary_color || '#3B82F6',
        text_color: botRes.data.text_color || '#FFFFFF',
        position: botRes.data.position || 'bottom-right',
      });

      // Set share state
      setIsPublic(botRes.data.is_public || false);

      // Set feature toggles
      setLeadFormEnabled(leadConfigRes.data?.enabled || false);
      setHandoffEnabled(handoffConfigRes.data?.enabled || false);
      setBookingEnabled(bookingConfigRes.data?.enabled || false);
      setBookingPrompt(bookingConfigRes.data?.booking_prompt || '');
      setMultiLanguageEnabled(langConfigRes.data?.enabled || false);
      setIsPersonal(botRes.data.is_personal || false);
    } catch (error) {
      console.error('Failed to load chatbot:', error);
      navigate('/chatbots');
    } finally {
      setLoading(false);
    }
  };

  // Share handlers
  const handleSaveShare = async () => {
    setSavingShare(true);
    try {
      const updateData = {
        is_public: isPublic,
      };
      // Only send password if it's set (to update) or if we want to remove it
      if (sharePassword) {
        updateData.share_password = sharePassword;
      }

      const response = await chatbots.update(id, updateData);
      setBot(response.data);
      setSharePassword(''); // Clear password field after save
    } catch (error) {
      console.error('Failed to save share settings:', error);
    } finally {
      setSavingShare(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!confirm('Remove password protection? Anyone with the link will be able to access the chatbot.')) return;

    setSavingShare(true);
    try {
      const response = await chatbots.update(id, { share_password: '' });
      setBot(response.data);
    } catch (error) {
      console.error('Failed to remove password:', error);
    } finally {
      setSavingShare(false);
    }
  };

  const copyShareLink = () => {
    if (bot?.share_link) {
      navigator.clipboard.writeText(bot.share_link);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const loadIntegrations = async () => {
    setLoadingIntegrations(true);
    try {
      const response = await integrations.list(id);
      setIntegrationsData(response.data.integrations || []);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await chatbots.update(id, formData);
      setBot((prev) => ({ ...prev, ...formData }));
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  // Feature toggle handlers
  const handleToggleLeadForm = async (enabled) => {
    setSavingFeatures(true);
    try {
      // When enabling, also enable smart capture (AI-triggered lead form)
      await leads.updateFormConfig(id, {
        enabled,
        smart_capture: enabled,  // Enable smart capture when lead form is enabled
        trigger: enabled ? 'smart' : 'manual'  // Use smart trigger
      });
      setLeadFormEnabled(enabled);
    } catch (error) {
      console.error('Failed to update lead form:', error);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleToggleHandoff = async (enabled) => {
    setSavingFeatures(true);
    try {
      await handoff.updateConfig(id, { enabled });
      setHandoffEnabled(enabled);
    } catch (error) {
      console.error('Failed to update handoff:', error);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleToggleBooking = async (enabled) => {
    setSavingFeatures(true);
    try {
      await handoff.toggleBooking(id, enabled);
      setBookingEnabled(enabled);
    } catch (error) {
      console.error('Failed to update booking notifications:', error);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleSaveBookingPrompt = async () => {
    setSavingBookingPrompt(true);
    try {
      await handoff.updateBookingConfig(id, { booking_prompt: bookingPrompt });
    } catch (error) {
      console.error('Failed to save booking prompt:', error);
    } finally {
      setSavingBookingPrompt(false);
    }
  };

  const handleToggleMultiLanguage = async (enabled) => {
    setSavingFeatures(true);
    try {
      await translation.updateConfig(id, { enabled });
      setMultiLanguageEnabled(enabled);
    } catch (error) {
      console.error('Failed to update language config:', error);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleTogglePersonalMode = async (enabled) => {
    setSavingFeatures(true);
    try {
      await chatbots.update(id, { is_personal: enabled });
      setIsPersonal(enabled);
    } catch (error) {
      console.error('Failed to update personal mode:', error);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await chatbots.uploadDocument(id, file);
      setDocuments((prev) => [...prev, response.data]);
      pollDocumentStatus(response.data.id);
    } catch (error) {
      console.error('Failed to upload:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const pollDocumentStatus = async (docId) => {
    const interval = setInterval(async () => {
      try {
        const response = await chatbots.listDocuments(id);
        const doc = response.data.find((d) => d.id === docId);
        if (doc && doc.status !== 'processing') {
          setDocuments(response.data);
          clearInterval(interval);
        }
      } catch (error) {
        clearInterval(interval);
      }
    }, 3000);
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Delete this document?')) return;

    try {
      await chatbots.deleteDocument(id, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode?.full_snippet || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Integration handlers
  const handleConnect = async (provider) => {
    setConnectingProvider(provider);
    try {
      const response = await integrations.getAuthUrl(provider, id);
      window.location.href = response.data.auth_url;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      setConnectingProvider(null);
    }
  };

  const handleDisconnect = async (provider) => {
    if (!confirm(`Disconnect ${PROVIDER_NAMES[provider]}? Imported documents will be kept.`)) return;

    try {
      await integrations.disconnect(id, provider);
      loadIntegrations();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleBrowse = (provider) => {
    setBrowsingProvider(provider);
  };

  const handleImportComplete = (count) => {
    setImportSuccess(`Successfully imported ${count} item${count > 1 ? 's' : ''}!`);
    setTimeout(() => setImportSuccess(null), 5000);
    // Refresh documents list
    chatbots.listDocuments(id).then(res => setDocuments(res.data));
    loadIntegrations();
  };

  const getIntegrationForProvider = (provider) => {
    return integrationsData.find(i => i.provider === provider);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{bot?.name}</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Configure and manage your chatbot</p>
          </div>
          <button
            onClick={() => {
              if (isPersonal) {
                window.open(`/chat/${id}`, '_blank');
              } else {
                // For non-personal mode, navigate to test page
                navigate(`/test-chatbot?botId=${id}`);
              }
            }}
            className="flex items-center px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] text-sm sm:text-base whitespace-nowrap"
          >
            <MessageSquare className="w-5 h-5 mr-2 flex-shrink-0" />
            {isPersonal ? 'Open Chat' : 'Test Chatbot'}
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <nav className="flex space-x-4 sm:space-x-8 min-w-max sm:min-w-0">
            {['settings', 'documents', 'integrations', 'share', 'embed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm sm:text-base capitalize whitespace-nowrap min-h-[44px] ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
            {!isPersonal && (
              <>
                <button
                  onClick={() => navigate(`/chatbots/${id}/analytics`)}
                  className="py-3 sm:py-4 px-1 border-b-2 border-transparent font-medium text-sm sm:text-base whitespace-nowrap min-h-[44px] text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </button>
                <button
                  onClick={() => navigate(`/chatbots/${id}/leads`)}
                  className="py-3 sm:py-4 px-1 border-b-2 border-transparent font-medium text-sm sm:text-base whitespace-nowrap min-h-[44px] text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  Leads
                </button>
                <button
                  onClick={() => navigate(`/chatbots/${id}/handoff`)}
                  className="py-3 sm:py-4 px-1 border-b-2 border-transparent font-medium text-sm sm:text-base whitespace-nowrap min-h-[44px] text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  Live Chat
                </button>
                {bookingEnabled && (
                  <button
                    onClick={() => navigate(`/chatbots/${id}/bookings`)}
                    className="py-3 sm:py-4 px-1 border-b-2 border-transparent font-medium text-sm sm:text-base whitespace-nowrap min-h-[44px] text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <Calendar className="w-4 h-4" />
                    Bookings
                  </button>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-3xl">
            {/* Basic Information Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  <p className="text-sm text-gray-500">Configure your chatbot's identity and greeting</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Chatbot Name</label>
                  <p className="text-xs text-gray-500 mb-2">This name will be displayed to your visitors</p>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Support Assistant, Sales Bot"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Welcome Message</label>
                  <p className="text-xs text-gray-500 mb-2">The first message visitors see when they open the chat</p>
                  <input
                    type="text"
                    value={formData.welcome_message}
                    onChange={(e) => setFormData((prev) => ({ ...prev, welcome_message: e.target.value }))}
                    placeholder="e.g., Hi! How can I help you today?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* AI Personality Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Personality & Behavior</h3>
                  <p className="text-sm text-gray-500">Define how your chatbot should respond and behave</p>
                </div>
              </div>

              {/* Quick Start Templates - Dropdown Selector */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <label className="text-sm font-medium text-gray-700">Quick Start with a Template</label>
                </div>

                <TemplateSelector
                  templates={PROMPT_TEMPLATES}
                  onSelect={(template) => setFormData((prev) => ({ ...prev, system_prompt: customizePrompt(template.prompt) }))}
                  getColorClasses={getTemplateColorClasses}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">System Instructions</label>
                <p className="text-xs text-gray-500 mb-2">
                  Tell the AI who it is, how it should respond, and any specific guidelines. This shapes the chatbot's personality and expertise.
                </p>
                <textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, system_prompt: e.target.value }))}
                  rows={10}
                  placeholder="e.g., You are a friendly customer support agent for [Company Name]. Be helpful, professional, and concise. If you don't know something, suggest contacting support@company.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                />
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <strong>Tip:</strong> Be specific about your chatbot's role, tone, and limitations. Customize the template above or write your own instructions.
                  </p>
                </div>
              </div>
            </div>

            {/* Appearance Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Eye className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Widget Appearance</h3>
                  <p className="text-sm text-gray-500">Customize how the chat widget looks on your website</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand Color</label>
                  <p className="text-xs text-gray-500 mb-2">Used for the chat bubble and header</p>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData((prev) => ({ ...prev, primary_color: e.target.value }))}
                      className="w-14 h-14 rounded-lg cursor-pointer border-2 border-gray-200 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={formData.primary_color}
                      onChange={(e) => setFormData((prev) => ({ ...prev, primary_color: e.target.value }))}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Widget Position</label>
                  <p className="text-xs text-gray-500 mb-2">Where the chat bubble appears on your site</p>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="bottom-right">Bottom Right (Recommended)</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                <p className="text-xs text-gray-500 mb-3">Preview</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-sm text-gray-600">
                    This is how your chat bubble will look
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>

            {/* Feature Toggles Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Features & Capabilities</h3>
                  <p className="text-sm text-gray-500">Enable advanced features for your chatbot</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {/* Lead Capture Toggle - Hidden in Personal Mode */}
                {!isPersonal && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-white rounded-xl border border-blue-100">
                    <div className="flex items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="p-2 sm:p-2.5 bg-blue-100 rounded-lg sm:rounded-xl flex-shrink-0">
                          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm sm:text-base">Smart Lead Capture</p>
                          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">AI asks for contact info when interested</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleLeadForm(!leadFormEnabled)}
                        disabled={savingFeatures}
                        className={`relative inline-flex h-8 w-14 sm:h-7 sm:w-12 items-center rounded-full transition-colors disabled:opacity-50 flex-shrink-0 ${
                          leadFormEnabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 sm:h-5 sm:w-5 transform rounded-full bg-white shadow transition-transform ${
                            leadFormEnabled ? 'translate-x-7 sm:translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* Human Handoff Toggle - Hidden in Personal Mode */}
                {!isPersonal && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-white rounded-xl border border-green-100">
                    <div className="flex items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="p-2 sm:p-2.5 bg-green-100 rounded-lg sm:rounded-xl flex-shrink-0">
                          <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm sm:text-base">Human Handoff</p>
                          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Let visitors request live support</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleHandoff(!handoffEnabled)}
                        disabled={savingFeatures}
                        className={`relative inline-flex h-8 w-14 sm:h-7 sm:w-12 items-center rounded-full transition-colors disabled:opacity-50 flex-shrink-0 ${
                          handoffEnabled ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 sm:h-5 sm:w-5 transform rounded-full bg-white shadow transition-transform ${
                            handoffEnabled ? 'translate-x-7 sm:translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* Booking Notifications Toggle - Hidden in Personal Mode */}
                {!isPersonal && (
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-white rounded-xl border border-amber-100">
                    <div className="flex items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="p-2 sm:p-2.5 bg-amber-100 rounded-lg sm:rounded-xl flex-shrink-0">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm sm:text-base">Booking System</p>
                          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Accept reservations via chat</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleBooking(!bookingEnabled)}
                        disabled={savingFeatures}
                        className={`relative inline-flex h-8 w-14 sm:h-7 sm:w-12 items-center rounded-full transition-colors disabled:opacity-50 flex-shrink-0 ${
                          bookingEnabled ? 'bg-amber-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 sm:h-5 sm:w-5 transform rounded-full bg-white shadow transition-transform ${
                            bookingEnabled ? 'translate-x-7 sm:translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* Booking Prompt - Shows when booking is enabled */}
                {!isPersonal && bookingEnabled && (
                  <div className="ml-4 p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-amber-700" />
                        <label className="text-sm font-semibold text-amber-900">Booking Instructions</label>
                      </div>
                      <p className="text-xs text-amber-700">
                        Tell the AI how to handle booking requests. These instructions guide what information to collect and how to confirm reservations.
                      </p>
                    </div>
                    <textarea
                      value={bookingPrompt}
                      onChange={(e) => setBookingPrompt(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                      placeholder="e.g., When a customer wants to book, collect their name, phone number, preferred date and time, and number of guests. Confirm the details before submitting."
                    />
                    <button
                      onClick={handleSaveBookingPrompt}
                      disabled={savingBookingPrompt}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {savingBookingPrompt ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Instructions'
                      )}
                    </button>
                  </div>
                )}

                {/* Multi-Language Toggle */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-white rounded-xl border border-purple-100">
                  <div className="flex items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="p-2 sm:p-2.5 bg-purple-100 rounded-lg sm:rounded-xl flex-shrink-0">
                        <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm sm:text-base">Multi-Language Support</p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Language selector in widget</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleMultiLanguage(!multiLanguageEnabled)}
                      disabled={savingFeatures}
                      className={`relative inline-flex h-8 w-14 sm:h-7 sm:w-12 items-center rounded-full transition-colors disabled:opacity-50 flex-shrink-0 ${
                        multiLanguageEnabled ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 sm:h-5 sm:w-5 transform rounded-full bg-white shadow transition-transform ${
                          multiLanguageEnabled ? 'translate-x-7 sm:translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Personal Mode Toggle */}
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-white rounded-xl border border-indigo-100">
                  <div className="flex items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="p-2 sm:p-2.5 bg-indigo-100 rounded-lg sm:rounded-xl flex-shrink-0">
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm sm:text-base">Personal Assistant Mode</p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Full-page chat with history</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePersonalMode(!isPersonal)}
                      disabled={savingFeatures}
                      className={`relative inline-flex h-8 w-14 sm:h-7 sm:w-12 items-center rounded-full transition-colors disabled:opacity-50 flex-shrink-0 ${
                        isPersonal ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 sm:h-5 sm:w-5 transform rounded-full bg-white shadow transition-transform ${
                          isPersonal ? 'translate-x-7 sm:translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {isPersonal && (
                  <div className="ml-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <p className="text-sm text-indigo-700">
                      <strong>Personal Mode is active.</strong> Your chatbot now has a full-page interface with conversation history.
                      Lead capture, handoff, and booking features are disabled in this mode.
                    </p>
                  </div>
                )}
              </div>

              {!isPersonal && (
                <p className="text-xs text-gray-400 mt-6 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Configure detailed settings in the Leads or Live Chat tabs above
                </p>
              )}
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Knowledge Base</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Upload documents to train your chatbot</p>
                </div>
                <label className="flex items-center justify-center px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer min-h-[44px] text-sm sm:text-base whitespace-nowrap">
                  <Upload className="w-5 h-5 mr-2 flex-shrink-0" />
                  {uploading ? 'Uploading...' : 'Upload Document'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-8 sm:py-12 border-2 border-dashed rounded-lg">
                  <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm sm:text-base text-gray-500">No documents uploaded yet</p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">Supports PDF, DOCX, and TXT files</p>
                </div>
              ) : (
                <div className="divide-y">
                  {documents.map((doc) => (
                    <div key={doc.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="flex items-center min-w-0 flex-1">
                        <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 flex-shrink-0" />
                        <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{doc.filename}</p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            {doc.chunks_count || 0} chunks • {(doc.size / 1024).toFixed(1)} KB
                            {doc.source_type && doc.source_type !== 'upload' && (
                              <span className="ml-2 text-blue-600">• {PROVIDER_NAMES[doc.source_type] || doc.source_type}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end space-x-4 pl-9 sm:pl-0">
                        {doc.status === 'processing' ? (
                          <span className="flex items-center text-yellow-600 text-xs sm:text-sm">
                            <Loader2 className="w-4 h-4 mr-1 animate-spin flex-shrink-0" />
                            Processing
                          </span>
                        ) : doc.status === 'completed' ? (
                          <span className="flex items-center text-green-600 text-xs sm:text-sm">
                            <Check className="w-4 h-4 mr-1 flex-shrink-0" />
                            Ready
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600 text-xs sm:text-sm">
                            <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                            Failed
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Success message */}
            {importSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <Check className="w-5 h-5" />
                {importSuccess}
              </div>
            )}

            <div className="flex items-center gap-3 mb-2">
              <Link2 className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Data Sources</h3>
                <p className="text-xs sm:text-sm text-gray-500">Connect external services to import documents</p>
              </div>
            </div>

            {loadingIntegrations ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROVIDERS.map((provider) => (
                  <IntegrationCard
                    key={provider}
                    provider={provider}
                    integration={getIntegrationForProvider(provider)}
                    onConnect={() => handleConnect(provider)}
                    onDisconnect={() => handleDisconnect(provider)}
                    onBrowse={() => handleBrowse(provider)}
                    connecting={connectingProvider === provider}
                    comingSoon={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Share Tab */}
        {activeTab === 'share' && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 max-w-2xl space-y-6">
            <div className="flex items-center gap-3">
              <Share2 className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Share Settings</h3>
                <p className="text-xs sm:text-sm text-gray-500">Share your chatbot with a public link</p>
              </div>
            </div>

            {/* Enable/Disable Sharing */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Unlock className="w-5 h-5 text-green-600" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Public Sharing</p>
                  <p className="text-sm text-gray-500">
                    {isPublic ? 'Anyone with the link can access' : 'Only accessible via embed code'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublic ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Share Link */}
            {isPublic && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Share Link</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={bot?.share_link || `${window.location.origin}/chat/${id}`}
                      readOnly
                      className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-600"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={copyShareLink}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-sm min-h-[42px]"
                      >
                        {shareCopied ? (
                          <>
                            <Check className="w-4 h-4 text-green-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <a
                        href={bot?.share_link || `/chat/${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-sm min-h-[42px]"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Password Protection */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Password Protection</span>
                    {bot?.has_password && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
                    )}
                  </div>

                  {bot?.has_password ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        This chatbot is password protected. Users need to enter the password to access it.
                      </p>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={sharePassword}
                            onChange={(e) => setSharePassword(e.target.value)}
                            placeholder="Enter new password to change"
                            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <button
                          onClick={handleRemovePassword}
                          className="px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Add a password to restrict access. Only people with the password can use the chatbot.
                      </p>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={sharePassword}
                          onChange={(e) => setSharePassword(e.target.value)}
                          placeholder="Set a password (optional)"
                          className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-2">
              <button
                onClick={handleSaveShare}
                disabled={savingShare}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px] text-sm sm:text-base flex items-center justify-center gap-2"
              >
                {savingShare ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Share Settings'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Embed Tab */}
        {activeTab === 'embed' && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 max-w-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Embed Code</h3>
                <p className="text-xs sm:text-sm text-gray-500">Add this code to your website</p>
              </div>
              <button
                onClick={copyEmbedCode}
                className="flex items-center justify-center px-4 py-3 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 min-h-[44px] text-sm sm:text-base whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Code className="w-5 h-5 mr-2 flex-shrink-0" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            <div className="bg-gray-900 rounded-lg p-3 sm:p-4 overflow-x-auto">
              <pre className="text-xs sm:text-sm text-gray-100">
                <code>{embedCode?.full_snippet}</code>
              </pre>
            </div>

            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-sm sm:text-base text-blue-900 mb-2">Instructions</h4>
              <ol className="list-decimal list-inside text-xs sm:text-sm text-blue-800 space-y-1">
                <li>Copy the embed code above</li>
                <li>Paste it before the closing &lt;/body&gt; tag on your website</li>
                <li>The chat widget will appear automatically</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* File Browser Modal */}
      {browsingProvider && (
        <FileBrowser
          botId={id}
          provider={browsingProvider}
          providerName={PROVIDER_NAMES[browsingProvider]}
          onClose={() => setBrowsingProvider(null)}
          onImportComplete={handleImportComplete}
        />
      )}
    </Layout>
  );
};

export default ChatbotDetail;
