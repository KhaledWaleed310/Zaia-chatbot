/**
 * Marketing event tracking utility
 * Tracks user actions on the website for marketing analytics
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

// Get or create a visitor ID for tracking
const getVisitorId = () => {
  let visitorId = localStorage.getItem('zaia_visitor_id');
  if (!visitorId) {
    visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('zaia_visitor_id', visitorId);
  }
  return visitorId;
};

// Detect device type
const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'Mobile';
  }
  return 'Desktop';
};

// Get traffic source from URL parameters or referrer
const getTrafficSource = () => {
  const params = new URLSearchParams(window.location.search);

  // Check UTM parameters
  const utmSource = params.get('utm_source');
  const utmMedium = params.get('utm_medium');
  const utmCampaign = params.get('utm_campaign');

  if (utmSource) {
    return {
      source: utmSource,
      medium: utmMedium || 'unknown',
      campaign: utmCampaign || 'unknown',
    };
  }

  // Check referrer
  const referrer = document.referrer;
  if (referrer) {
    try {
      const refUrl = new URL(referrer);
      const refHost = refUrl.hostname.toLowerCase();

      if (refHost.includes('facebook') || refHost.includes('fb.com')) {
        return { source: 'facebook', medium: 'social', campaign: 'organic' };
      }
      if (refHost.includes('google')) {
        return { source: 'google', medium: 'organic', campaign: 'organic' };
      }
      if (refHost.includes('twitter') || refHost.includes('t.co')) {
        return { source: 'twitter', medium: 'social', campaign: 'organic' };
      }
      if (refHost.includes('linkedin')) {
        return { source: 'linkedin', medium: 'social', campaign: 'organic' };
      }
      if (refHost.includes('instagram')) {
        return { source: 'instagram', medium: 'social', campaign: 'organic' };
      }

      return { source: refHost, medium: 'referral', campaign: 'unknown' };
    } catch {
      return { source: 'direct', medium: 'none', campaign: 'none' };
    }
  }

  return { source: 'direct', medium: 'none', campaign: 'none' };
};

// Get browser/language info
const getBrowserInfo = () => {
  return {
    language: navigator.language || 'unknown',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    screen_width: window.screen.width,
    screen_height: window.screen.height,
  };
};

/**
 * Track an event
 * @param {string} eventType - Type of event (page_view, signup, login, chat_opened, etc.)
 * @param {object} additionalData - Any additional data to include
 */
export const trackEvent = async (eventType, additionalData = {}) => {
  try {
    const visitorId = getVisitorId();
    const device = getDeviceType();
    const traffic = getTrafficSource();
    const browser = getBrowserInfo();

    const params = new URLSearchParams({
      event_type: eventType,
      visitor_id: visitorId,
      source: traffic.source,
    });

    // Add metadata as JSON
    const metadata = {
      device,
      medium: traffic.medium,
      campaign: traffic.campaign,
      page: window.location.pathname,
      referrer: document.referrer || 'direct',
      ...browser,
      ...additionalData,
    };

    // Use fetch with keepalive for page unload events
    await fetch(`${API_BASE}/api/v1/marketing/track-conversion?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metadata }),
      keepalive: true,
    });
  } catch (error) {
    // Silently fail - tracking should not break the app
    console.debug('Tracking failed:', error);
  }
};

// Event type constants
export const EVENTS = {
  PAGE_VIEW: 'page_view',
  LANDING_VIEW: 'landing_view',
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  LOGIN: 'login',
  CHAT_OPENED: 'chat_opened',
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  LEAD_CAPTURED: 'lead_captured',
  BOOKING_STARTED: 'booking_started',
  BOOKING_COMPLETED: 'booking_completed',
  PRICING_VIEWED: 'pricing_viewed',
  DEMO_REQUESTED: 'demo_requested',
  CTA_CLICKED: 'cta_clicked',
};

export default { trackEvent, EVENTS, getVisitorId };
