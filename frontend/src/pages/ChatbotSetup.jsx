import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { chatbots } from '../utils/api';
import { StepIndicator } from '@/components/shared/StepIndicator';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  MessageSquare,
  Sparkles,
  Upload,
  Eye,
  Settings2,
  ArrowLeft,
  ArrowRight,
  Check,
  ShoppingBag,
  Headphones,
  CalendarCheck,
  UserPlus,
  HelpCircle,
  Wrench,
  GraduationCap,
  Home,
  Users,
  Phone,
  Calendar,
  Globe,
  Loader2,
  FileText,
  AlertCircle,
  Trash2,
} from 'lucide-react';

const SETUP_STEPS = [
  { id: 'basics', name: 'Basics', icon: MessageSquare },
  { id: 'personality', name: 'Personality', icon: Sparkles },
  { id: 'knowledge', name: 'Knowledge', icon: Upload },
  { id: 'appearance', name: 'Appearance', icon: Eye },
  { id: 'features', name: 'Features', icon: Settings2 },
];

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

## Guidelines:
- If asked about pricing, provide information if available, or offer to connect them with the sales team
- For technical questions you can't answer, collect their contact info and promise a follow-up
- End conversations with a clear next step (book a demo, sign up, contact sales)`
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

## Guidelines:
- Always check the knowledge base before saying you don't know
- For issues you can't resolve, offer to escalate to a human agent
- Thank customers for their patience and feedback`
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

## Information to Collect:
1. Full name of the person booking
2. Phone or WhatsApp number for confirmation
3. Preferred date and time
4. Number of people/guests (if applicable)
5. Any special requests or requirements`
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
- Admit when you don't have information rather than guessing

## Guidelines:
- Always base answers on your knowledge base - don't make things up
- If a question isn't in your knowledge base, say so clearly and offer alternatives`
  },
];

const ChatbotSetup = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [bot, setBot] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    welcome_message: 'Hi! How can I help you today?',
    system_prompt: '',
    primary_color: '#3B82F6',
    position: 'bottom-right',
  });

  // Feature toggles
  const [features, setFeatures] = useState({
    lead_capture: false,
    handoff: false,
    booking: false,
    multi_language: false,
  });

  // Documents
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadBot();
  }, [id]);

  const loadBot = async () => {
    try {
      const data = await chatbots.get(id);
      setBot(data);
      setFormData({
        name: data.name || '',
        welcome_message: data.welcome_message || 'Hi! How can I help you today?',
        system_prompt: data.system_prompt || '',
        primary_color: data.primary_color || '#3B82F6',
        position: data.position || 'bottom-right',
      });
      setFeatures({
        lead_capture: data.lead_form_enabled || false,
        handoff: data.handoff_enabled || false,
        booking: data.booking_enabled || false,
        multi_language: data.multi_language_enabled || false,
      });
      setDocuments(data.documents || []);
    } catch (err) {
      setError('Failed to load chatbot');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep < SETUP_STEPS.length - 1) {
      // Save current step data
      await saveStepData();
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveStepData = async () => {
    setSaving(true);
    try {
      await chatbots.update(id, formData);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await chatbots.update(id, formData);
      navigate(`/chatbots/${id}`);
    } catch (err) {
      setError('Failed to save chatbot');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    setUploading(true);
    try {
      for (const file of files) {
        await chatbots.uploadDocument(id, file);
      }
      await loadBot();
    } catch (err) {
      setError('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await chatbots.deleteDocument(id, docId);
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err) {
      setError('Failed to delete document');
    }
  };

  const handleToggleFeature = async (feature, enabled) => {
    setFeatures(prev => ({ ...prev, [feature]: enabled }));
    try {
      // API calls for each feature toggle
      if (feature === 'lead_capture') {
        // Would call leads.updateConfig
      } else if (feature === 'handoff') {
        // Would call handoff.updateConfig
      }
    } catch (err) {
      console.error('Failed to toggle feature:', err);
    }
  };

  const selectTemplate = (template) => {
    setFormData(prev => ({ ...prev, system_prompt: template.prompt }));
  };

  if (loading) {
    return <LoadingState variant="page" text="Loading setup wizard..." />;
  }

  const progress = ((currentStep + 1) / SETUP_STEPS.length) * 100;

  return (
    <Layout
      breadcrumbs={[
        { label: 'Chatbots', href: '/chatbots' },
        { label: bot?.name || 'Chatbot', href: `/chatbots/${id}` },
        { label: 'Setup' },
      ]}
    >
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-6">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Step {currentStep + 1} of {SETUP_STEPS.length}
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator
          steps={SETUP_STEPS}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {(() => {
                const StepIcon = SETUP_STEPS[currentStep].icon;
                return <StepIcon className="w-6 h-6 text-primary" />;
              })()}
              {SETUP_STEPS[currentStep].name}
            </CardTitle>
            <CardDescription>
              {currentStep === 0 && "Set up your chatbot's basic information"}
              {currentStep === 1 && "Define how your chatbot responds and behaves"}
              {currentStep === 2 && "Upload documents to train your chatbot"}
              {currentStep === 3 && "Customize how the chat widget looks"}
              {currentStep === 4 && "Enable advanced features for your chatbot"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Basics */}
            {currentStep === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Chatbot Name</Label>
                  <p className="text-xs text-muted-foreground">This name will be displayed to your visitors</p>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Support Assistant, Sales Bot"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome">Welcome Message</Label>
                  <p className="text-xs text-muted-foreground">The first message visitors see when they open the chat</p>
                  <Input
                    id="welcome"
                    value={formData.welcome_message}
                    onChange={(e) => setFormData(prev => ({ ...prev, welcome_message: e.target.value }))}
                    placeholder="e.g., Hi! How can I help you today?"
                  />
                </div>
              </>
            )}

            {/* Step 2: Personality */}
            {currentStep === 1 && (
              <>
                <div className="space-y-3">
                  <Label>Quick Start Templates</Label>
                  <p className="text-xs text-muted-foreground">Choose a template to get started quickly</p>
                  <div className="grid grid-cols-2 gap-3">
                    {PROMPT_TEMPLATES.map((template) => {
                      const Icon = template.icon;
                      return (
                        <button
                          key={template.id}
                          onClick={() => selectTemplate(template)}
                          className="p-4 border rounded-lg text-left hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">{template.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">System Instructions</Label>
                  <p className="text-xs text-muted-foreground">
                    Tell the AI who it is, how it should respond, and any specific guidelines
                  </p>
                  <Textarea
                    id="prompt"
                    value={formData.system_prompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                    rows={10}
                    placeholder="e.g., You are a friendly customer support agent..."
                    className="font-mono text-sm"
                  />
                </div>
              </>
            )}

            {/* Step 3: Knowledge */}
            {currentStep === 2 && (
              <>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                  <p className="font-medium mb-2">Upload Documents</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    PDF, DOCX, TXT files up to 10MB each
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.doc"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button asChild disabled={uploading}>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Choose Files'
                      )}
                    </label>
                  </Button>
                </div>

                {documents.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded Documents ({documents.length})</Label>
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{doc.filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.status === 'processed' ? 'Ready' : 'Processing...'}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Tip:</strong> Upload your FAQs, product documentation, or any content you want your chatbot to reference when answering questions.
                  </p>
                </div>
              </>
            )}

            {/* Step 4: Appearance */}
            {currentStep === 3 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Brand Color</Label>
                    <p className="text-xs text-muted-foreground">Used for the chat bubble and header</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="w-14 h-14 rounded-lg cursor-pointer border-2"
                      />
                      <Input
                        value={formData.primary_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Widget Position</Label>
                    <p className="text-xs text-muted-foreground">Where the chat bubble appears</p>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full h-10 px-3 border rounded-md bg-background"
                    >
                      <option value="bottom-right">Bottom Right (Recommended)</option>
                      <option value="bottom-left">Bottom Left</option>
                    </select>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-6 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-4">Preview</p>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: formData.primary_color }}
                    >
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      This is how your chat bubble will look on your website
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 5: Features */}
            {currentStep === 4 && (
              <div className="space-y-4">
                {/* Lead Capture */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Smart Lead Capture</p>
                      <p className="text-sm text-muted-foreground">AI asks for contact info when visitors show interest</p>
                    </div>
                  </div>
                  <Switch
                    checked={features.lead_capture}
                    onCheckedChange={(checked) => handleToggleFeature('lead_capture', checked)}
                  />
                </div>

                {/* Human Handoff */}
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Human Handoff</p>
                      <p className="text-sm text-muted-foreground">Let visitors request live support</p>
                    </div>
                  </div>
                  <Switch
                    checked={features.handoff}
                    onCheckedChange={(checked) => handleToggleFeature('handoff', checked)}
                  />
                </div>

                {/* Booking System */}
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium">Booking System</p>
                      <p className="text-sm text-muted-foreground">Accept reservations via chat</p>
                    </div>
                  </div>
                  <Switch
                    checked={features.booking}
                    onCheckedChange={(checked) => handleToggleFeature('booking', checked)}
                  />
                </div>

                {/* Multi-Language */}
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Globe className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Multi-Language Support</p>
                      <p className="text-sm text-muted-foreground">Language selector in widget</p>
                    </div>
                  </div>
                  <Switch
                    checked={features.multi_language}
                    onCheckedChange={(checked) => handleToggleFeature('multi_language', checked)}
                  />
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0 || saving}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentStep === SETUP_STEPS.length - 1 ? (
              <Button onClick={handleComplete} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Skip wizard link */}
        <p className="text-center mt-6 text-sm text-muted-foreground">
          <Link to={`/chatbots/${id}?tab=settings`} className="underline hover:text-foreground">
            Skip wizard and configure manually
          </Link>
        </p>
      </div>
    </Layout>
  );
};

export default ChatbotSetup;
