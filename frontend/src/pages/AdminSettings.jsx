import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { admin } from '../utils/api';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { LoadingState } from '@/components/shared/LoadingState';
import {
  Settings,
  Save,
  RefreshCw,
  Globe,
  Shield,
  Zap,
  MessageSquare,
  Bell,
  AlertCircle,
} from 'lucide-react';

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'registration', label: 'Registration', icon: Shield },
  { id: 'subscriptions', label: 'Subscriptions', icon: Zap },
  { id: 'ai', label: 'AI Config', icon: MessageSquare },
  { id: 'maintenance', label: 'Maintenance', icon: Bell },
];

const AdminSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';

  const [settings, setSettings] = useState({
    // General
    app_name: 'Aiden Link',
    app_description: 'AI-powered chatbot platform',
    support_email: 'info@zaiasystems.com',

    // Registration
    allow_registration: true,
    require_email_verification: false,
    default_subscription_tier: 'free',

    // Limits - Free tier
    free_max_chatbots: 1,
    free_max_documents: 5,
    free_max_messages_per_day: 50,
    free_max_file_size_mb: 5,

    // Limits - Pro tier
    pro_max_chatbots: 10,
    pro_max_documents: 50,
    pro_max_messages_per_day: 1000,
    pro_max_file_size_mb: 25,

    // Limits - Enterprise tier
    enterprise_max_chatbots: -1,
    enterprise_max_documents: -1,
    enterprise_max_messages_per_day: -1,
    enterprise_max_file_size_mb: 100,

    // AI Settings
    default_model: 'deepseek-chat',
    max_context_chunks: 10,
    temperature: 0.7,

    // Maintenance
    maintenance_mode: false,
    maintenance_message: 'We are currently performing maintenance. Please try again later.',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/dashboard');
      return;
    }
    loadSettings();
  }, [user, navigate]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await admin.getSettings();
      if (res.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.log('Using default settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await admin.updateSettings(settings);
      toast.success('Settings saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleTabChange = (value) => {
    setSearchParams({ tab: value });
  };

  if (loading) {
    return (
      <Layout>
        <LoadingState variant="section" text="Loading settings..." />
      </Layout>
    );
  }

  return (
    <Layout
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'System Settings' },
      ]}
      pageTitle="System Settings"
      pageDescription="Configure application settings and limits"
      pageIcon={<Settings className="w-6 h-6 text-orange-600" />}
      pageActions={
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadSettings} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 data-[state=active]:bg-background"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-muted-foreground" />
                General Settings
              </CardTitle>
              <CardDescription>Basic application configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="app_name">Application Name</Label>
                  <Input
                    id="app_name"
                    value={settings.app_name}
                    onChange={(e) => handleChange('app_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support_email">Support Email</Label>
                  <Input
                    id="support_email"
                    type="email"
                    value={settings.support_email}
                    onChange={(e) => handleChange('support_email', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="app_description">Description</Label>
                <Textarea
                  id="app_description"
                  value={settings.app_description}
                  onChange={(e) => handleChange('app_description', e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Registration Settings Tab */}
        <TabsContent value="registration">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-muted-foreground" />
                Registration & Access
              </CardTitle>
              <CardDescription>Control user sign-up and access settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Allow New Registrations</p>
                  <p className="text-sm text-muted-foreground">Enable or disable user sign-ups</p>
                </div>
                <Switch
                  checked={settings.allow_registration}
                  onCheckedChange={(checked) => handleChange('allow_registration', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Require Email Verification</p>
                  <p className="text-sm text-muted-foreground">Users must verify email before access</p>
                </div>
                <Switch
                  checked={settings.require_email_verification}
                  onCheckedChange={(checked) => handleChange('require_email_verification', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_tier">Default Subscription Tier</Label>
                <select
                  id="default_tier"
                  value={settings.default_subscription_tier}
                  onChange={(e) => handleChange('default_subscription_tier', e.target.value)}
                  className="w-full h-10 px-3 border rounded-md bg-background"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Limits Tab */}
        <TabsContent value="subscriptions">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-muted-foreground" />
                  Subscription Limits
                </CardTitle>
                <CardDescription>Set -1 for unlimited</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Free Tier */}
                <div>
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                    Free Tier
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Max Chatbots</Label>
                      <Input
                        type="number"
                        value={settings.free_max_chatbots}
                        onChange={(e) => handleChange('free_max_chatbots', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max Documents</Label>
                      <Input
                        type="number"
                        value={settings.free_max_documents}
                        onChange={(e) => handleChange('free_max_documents', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Messages/Day</Label>
                      <Input
                        type="number"
                        value={settings.free_max_messages_per_day}
                        onChange={(e) => handleChange('free_max_messages_per_day', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max File Size (MB)</Label>
                      <Input
                        type="number"
                        value={settings.free_max_file_size_mb}
                        onChange={(e) => handleChange('free_max_file_size_mb', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* Pro Tier */}
                <div>
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    Pro Tier
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Max Chatbots</Label>
                      <Input
                        type="number"
                        value={settings.pro_max_chatbots}
                        onChange={(e) => handleChange('pro_max_chatbots', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max Documents</Label>
                      <Input
                        type="number"
                        value={settings.pro_max_documents}
                        onChange={(e) => handleChange('pro_max_documents', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Messages/Day</Label>
                      <Input
                        type="number"
                        value={settings.pro_max_messages_per_day}
                        onChange={(e) => handleChange('pro_max_messages_per_day', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max File Size (MB)</Label>
                      <Input
                        type="number"
                        value={settings.pro_max_file_size_mb}
                        onChange={(e) => handleChange('pro_max_file_size_mb', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* Enterprise Tier */}
                <div>
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                    Enterprise Tier
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Max Chatbots</Label>
                      <Input
                        type="number"
                        value={settings.enterprise_max_chatbots}
                        onChange={(e) => handleChange('enterprise_max_chatbots', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max Documents</Label>
                      <Input
                        type="number"
                        value={settings.enterprise_max_documents}
                        onChange={(e) => handleChange('enterprise_max_documents', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Messages/Day</Label>
                      <Input
                        type="number"
                        value={settings.enterprise_max_messages_per_day}
                        onChange={(e) => handleChange('enterprise_max_messages_per_day', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max File Size (MB)</Label>
                      <Input
                        type="number"
                        value={settings.enterprise_max_file_size_mb}
                        onChange={(e) => handleChange('enterprise_max_file_size_mb', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Configuration Tab */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                AI Configuration
              </CardTitle>
              <CardDescription>Configure AI model settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="default_model">Default Model</Label>
                  <select
                    id="default_model"
                    value={settings.default_model}
                    onChange={(e) => handleChange('default_model', e.target.value)}
                    className="w-full h-10 px-3 border rounded-md bg-background"
                  >
                    <option value="deepseek-chat">DeepSeek Chat</option>
                    <option value="deepseek-coder">DeepSeek Coder</option>
                    <option value="deepseek-reasoner">DeepSeek Reasoner</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_context">Max Context Chunks</Label>
                  <Input
                    id="max_context"
                    type="number"
                    value={settings.max_context_chunks}
                    onChange={(e) => handleChange('max_context_chunks', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Number of document chunks to include in context</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={settings.temperature}
                    onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">0 = deterministic, 2 = creative</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-muted-foreground" />
                Maintenance Mode
              </CardTitle>
              <CardDescription>Control system availability</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">Enable Maintenance Mode</p>
                    <p className="text-sm text-yellow-700">Block all non-admin users from accessing the app</p>
                  </div>
                </div>
                <Switch
                  checked={settings.maintenance_mode}
                  onCheckedChange={(checked) => handleChange('maintenance_mode', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance_message">Maintenance Message</Label>
                <Textarea
                  id="maintenance_message"
                  value={settings.maintenance_message}
                  onChange={(e) => handleChange('maintenance_message', e.target.value)}
                  rows={3}
                  placeholder="Message displayed to users during maintenance"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default AdminSettings;
