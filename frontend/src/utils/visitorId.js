/**
 * Visitor ID Management for Personal Chatbot Mode
 *
 * Generates and persists anonymous visitor IDs in localStorage.
 * Used to track conversations across page refreshes without login.
 */

const VISITOR_ID_KEY = 'zaia_visitor_id';

/**
 * Generate UUID v4
 * @returns {string} UUID
 */
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Get or create visitor ID
 * Creates new ID if none exists in localStorage
 *
 * @returns {string} Visitor ID
 */
export const getOrCreateVisitorId = () => {
  try {
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);

    if (!visitorId) {
      visitorId = generateUUID();
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
      console.log('[VisitorID] Created new visitor ID:', visitorId.substring(0, 8) + '...');
    }

    return visitorId;
  } catch (error) {
    // localStorage might be blocked (incognito, etc.)
    console.warn('[VisitorID] localStorage not available, using session ID');
    return generateUUID();
  }
};

/**
 * Get visitor ID without creating new one
 * @returns {string|null} Visitor ID or null
 */
export const getVisitorId = () => {
  try {
    return localStorage.getItem(VISITOR_ID_KEY);
  } catch (error) {
    return null;
  }
};

/**
 * Clear visitor ID (for testing or logout)
 */
export const clearVisitorId = () => {
  try {
    localStorage.removeItem(VISITOR_ID_KEY);
    console.log('[VisitorID] Cleared visitor ID');
  } catch (error) {
    console.warn('[VisitorID] Could not clear visitor ID');
  }
};

/**
 * Check if visitor ID exists
 * @returns {boolean}
 */
export const hasVisitorId = () => {
  try {
    return !!localStorage.getItem(VISITOR_ID_KEY);
  } catch (error) {
    return false;
  }
};

export default {
  getOrCreateVisitorId,
  getVisitorId,
  clearVisitorId,
  hasVisitorId
};
