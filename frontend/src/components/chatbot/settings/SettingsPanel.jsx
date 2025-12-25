import { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  FileText,
  Eye,
  Check,
  Loader2,
  Users,
  Phone,
  Globe,
  Calendar,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { chatbots, leads, handoff, translation } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { FeatureToggle } from '@/components/shared/FeatureToggle';
import { PROMPT_TEMPLATES, getTemplateColorClasses } from '@/constants/promptTemplates';

// Template Selector Component
const TemplateSelector = ({ templates, onSelect, getColorClasses }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const dropdownRef = useRef(null);

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

const SettingsPanel = () => {
  const { t } = useTranslation('dashboard');
  const { isRtl } = useLanguage();
  const { bot, features, reloadBot, isPersonal } = useOutletContext();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [savingBookingPrompt, setSavingBookingPrompt] = useState(false);

  // Feature states (local)
  const [leadFormEnabled, setLeadFormEnabled] = useState(features?.leads || false);
  const [handoffEnabled, setHandoffEnabled] = useState(features?.handoff || false);
  const [bookingEnabled, setBookingEnabled] = useState(features?.bookings || false);
  const [bookingPrompt, setBookingPrompt] = useState('');
  const [multiLanguageEnabled, setMultiLanguageEnabled] = useState(features?.multiLanguage || false);
  const [isPersonalMode, setIsPersonalMode] = useState(isPersonal || false);

  const [formData, setFormData] = useState({
    name: bot?.name || '',
    system_prompt: bot?.system_prompt || '',
    welcome_message: bot?.welcome_message || '',
    primary_color: bot?.primary_color || '#3B82F6',
    text_color: bot?.text_color || '#FFFFFF',
    position: bot?.position || 'bottom-right',
  });

  // Update form when bot loads
  useEffect(() => {
    if (bot) {
      setFormData({
        name: bot.name || '',
        system_prompt: bot.system_prompt || '',
        welcome_message: bot.welcome_message || '',
        primary_color: bot.primary_color || '#3B82F6',
        text_color: bot.text_color || '#FFFFFF',
        position: bot.position || 'bottom-right',
      });
      setIsPersonalMode(bot.is_personal || false);
    }
  }, [bot]);

  // Update features when they change
  useEffect(() => {
    setLeadFormEnabled(features?.leads || false);
    setHandoffEnabled(features?.handoff || false);
    setBookingEnabled(features?.bookings || false);
    setMultiLanguageEnabled(features?.multiLanguage || false);
  }, [features]);

  // Load booking prompt
  useEffect(() => {
    const loadBookingConfig = async () => {
      try {
        const res = await handoff.getBookingConfig(bot?.id);
        setBookingPrompt(res.data?.booking_prompt || '');
      } catch (error) {
        // Ignore
      }
    };
    if (bot?.id) {
      loadBookingConfig();
    }
  }, [bot?.id]);

  const companyName = user?.company_name || bot?.name || 'Your Company';

  const customizePrompt = (promptTemplate) => {
    return promptTemplate
      .replace(/\[Company Name\]/g, companyName)
      .replace(/\[company name\]/g, companyName)
      .replace(/our products\/services/g, `${companyName}'s products/services`)
      .replace(/our team/g, `the ${companyName} team`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await chatbots.update(bot.id, formData);
      await reloadBot();
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
      await leads.updateFormConfig(bot.id, {
        enabled,
        smart_capture: enabled,
        trigger: enabled ? 'smart' : 'manual'
      });
      setLeadFormEnabled(enabled);
      await reloadBot();
    } catch (error) {
      console.error('Failed to update lead form:', error);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleToggleHandoff = async (enabled) => {
    setSavingFeatures(true);
    try {
      await handoff.updateConfig(bot.id, { enabled });
      setHandoffEnabled(enabled);
      await reloadBot();
    } catch (error) {
      console.error('Failed to update handoff:', error);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleToggleBooking = async (enabled) => {
    setSavingFeatures(true);
    try {
      await handoff.toggleBooking(bot.id, enabled);
      setBookingEnabled(enabled);
      await reloadBot();
    } catch (error) {
      console.error('Failed to update booking:', error);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleSaveBookingPrompt = async () => {
    setSavingBookingPrompt(true);
    try {
      await handoff.updateBookingConfig(bot.id, { booking_prompt: bookingPrompt });
    } catch (error) {
      console.error('Failed to save booking prompt:', error);
    } finally {
      setSavingBookingPrompt(false);
    }
  };

  const handleToggleMultiLanguage = async (enabled) => {
    setSavingFeatures(true);
    try {
      await translation.updateConfig(bot.id, { enabled });
      setMultiLanguageEnabled(enabled);
      await reloadBot();
    } catch (error) {
      console.error('Failed to update language config:', error);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleTogglePersonalMode = async (enabled) => {
    setSavingFeatures(true);
    try {
      await chatbots.update(bot.id, { is_personal: enabled });
      setIsPersonalMode(enabled);
      await reloadBot();
    } catch (error) {
      console.error('Failed to update personal mode:', error);
    } finally {
      setSavingFeatures(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Basic Information Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('chatbotDetail.settings.basicInfo')}</h3>
            <p className="text-sm text-gray-500">{t('chatbotDetail.settings.basicInfoDesc')}</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('chatbotDetail.settings.name')}</label>
            <p className="text-xs text-gray-500 mb-2">{t('chatbotDetail.settings.nameDesc')}</p>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t('chatbotDetail.settings.namePlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('chatbotDetail.settings.welcomeMessage')}</label>
            <p className="text-xs text-gray-500 mb-2">{t('chatbotDetail.settings.welcomeMessageDesc')}</p>
            <input
              type="text"
              value={formData.welcome_message}
              onChange={(e) => setFormData((prev) => ({ ...prev, welcome_message: e.target.value }))}
              placeholder={t('chatbotDetail.settings.welcomeMessagePlaceholder')}
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
            <h3 className="text-lg font-semibold text-gray-900">{t('chatbotDetail.settings.aiPersonality')}</h3>
            <p className="text-sm text-gray-500">{t('chatbotDetail.settings.aiPersonalityDesc')}</p>
          </div>
        </div>

        {/* Quick Start Templates */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <label className="text-sm font-medium text-gray-700">{t('chatbotDetail.settings.promptTemplate')}</label>
          </div>
          <TemplateSelector
            templates={PROMPT_TEMPLATES}
            onSelect={(template) => setFormData((prev) => ({ ...prev, system_prompt: customizePrompt(template.prompt) }))}
            getColorClasses={getTemplateColorClasses}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('chatbotDetail.settings.systemPrompt')}</label>
          <p className="text-xs text-gray-500 mb-2">
            {t('chatbotDetail.settings.systemPromptDesc')}
          </p>
          <textarea
            value={formData.system_prompt}
            onChange={(e) => setFormData((prev) => ({ ...prev, system_prompt: e.target.value }))}
            rows={10}
            placeholder={t('chatbotDetail.settings.systemPromptPlaceholder')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
          />
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <Eye className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('chatbotDetail.settings.appearance')}</h3>
            <p className="text-sm text-gray-500">{t('chatbotDetail.settings.appearanceDesc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('chatbotDetail.settings.brandColor')}</label>
            <p className="text-xs text-gray-500 mb-2">{t('chatbotDetail.settings.brandColorDesc')}</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('chatbotDetail.settings.widgetPosition')}</label>
            <p className="text-xs text-gray-500 mb-2">{t('chatbotDetail.settings.widgetPositionDesc')}</p>
            <select
              value={formData.position}
              onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="bottom-right">{t('chatbotDetail.settings.positions.bottomRight')}</option>
              <option value="bottom-left">{t('chatbotDetail.settings.positions.bottomLeft')}</option>
            </select>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <p className="text-xs text-gray-500 mb-3">{t('chatbotDetail.settings.preview')}</p>
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: formData.primary_color }}
            >
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div className="text-sm text-gray-600">
              {t('chatbotDetail.settings.previewText')}
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
              {t('chatbotDetail.saving')}
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {t('chatbotDetail.saveChanges')}
            </>
          )}
        </button>
      </div>

      {/* Features Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('chatbotDetail.settings.features')}</h3>
            <p className="text-sm text-gray-500">{t('chatbotDetail.settings.featuresDesc')}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Lead Capture - Hidden in Personal Mode */}
          {!isPersonalMode && (
            <FeatureToggle
              enabled={leadFormEnabled}
              onChange={handleToggleLeadForm}
              icon={Users}
              color="blue"
              title={t('chatbotDetail.settings.smartLeadCapture')}
              description={t('chatbotDetail.settings.smartLeadCaptureDesc')}
              disabled={savingFeatures}
            />
          )}

          {/* Human Handoff - Hidden in Personal Mode */}
          {!isPersonalMode && (
            <FeatureToggle
              enabled={handoffEnabled}
              onChange={handleToggleHandoff}
              icon={Phone}
              color="green"
              title={t('chatbotDetail.settings.humanHandoff')}
              description={t('chatbotDetail.settings.humanHandoffDesc')}
              disabled={savingFeatures}
            />
          )}

          {/* Booking System - Hidden in Personal Mode */}
          {!isPersonalMode && (
            <FeatureToggle
              enabled={bookingEnabled}
              onChange={handleToggleBooking}
              icon={Calendar}
              color="amber"
              title={t('chatbotDetail.settings.bookingSystem')}
              description={t('chatbotDetail.settings.bookingSystemDesc')}
              disabled={savingFeatures}
            >
              {/* Booking Prompt */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3 mt-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-amber-700" />
                    <label className="text-sm font-semibold text-amber-900">{t('chatbotDetail.settings.bookingInstructions')}</label>
                  </div>
                  <p className="text-xs text-amber-700">
                    {t('chatbotDetail.settings.bookingInstructionsDesc')}
                  </p>
                </div>
                <textarea
                  value={bookingPrompt}
                  onChange={(e) => setBookingPrompt(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                  placeholder={t('chatbotDetail.settings.bookingPlaceholder')}
                />
                <button
                  onClick={handleSaveBookingPrompt}
                  disabled={savingBookingPrompt}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {savingBookingPrompt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('chatbotDetail.saving')}
                    </>
                  ) : (
                    t('chatbotDetail.settings.saveInstructions')
                  )}
                </button>
              </div>
            </FeatureToggle>
          )}

          {/* Multi-Language */}
          <FeatureToggle
            enabled={multiLanguageEnabled}
            onChange={handleToggleMultiLanguage}
            icon={Globe}
            color="purple"
            title={t('chatbotDetail.settings.multiLanguage')}
            description={t('chatbotDetail.settings.multiLanguageDesc')}
            disabled={savingFeatures}
          />

          {/* Personal Mode */}
          <FeatureToggle
            enabled={isPersonalMode}
            onChange={handleTogglePersonalMode}
            icon={MessageSquare}
            color="indigo"
            title={t('chatbotDetail.settings.personalMode')}
            description={t('chatbotDetail.settings.personalModeDesc')}
            disabled={savingFeatures}
          >
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg mt-3">
              <p className="text-sm text-indigo-700">
                {t('chatbotDetail.settings.personalModeActive')}
              </p>
            </div>
          </FeatureToggle>
        </div>

        {!isPersonalMode && (
          <p className="text-xs text-gray-400 mt-6 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {t('chatbotDetail.settings.featuresNote')}
          </p>
        )}
      </div>
    </div>
  );
};

export { SettingsPanel };
