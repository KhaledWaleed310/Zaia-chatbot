(function() {
  'use strict';

  // Get bot ID from script tag
  const currentScript = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const botId = currentScript.getAttribute('data-bot-id');
  if (!botId) {
    console.error('ZAIA Chat: Missing data-bot-id attribute');
    return;
  }

  // Dynamically determine API and WS base URLs from script source
  const scriptSrc = currentScript.src;
  let baseHost = 'chatbot.zaiasystems.com';
  try {
    const scriptUrl = new URL(scriptSrc);
    baseHost = scriptUrl.host;
  } catch (e) {
    console.warn('ZAIA Chat: Could not parse script URL, using default host');
  }
  const API_BASE = `https://${baseHost}/api/v1`;
  const WS_BASE = `wss://${baseHost}/api/v1`;

  // Marketing tracking
  let chatOpened = false;
  let messageCount = 0;

  function getOrCreateVisitorId() {
    let visitorId = localStorage.getItem('zaia_visitor_id');
    if (!visitorId) {
      visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('zaia_visitor_id', visitorId);
    }
    return visitorId;
  }

  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'Tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'Mobile';
    return 'Desktop';
  }

  async function trackMarketingEvent(eventType, additionalData = {}) {
    try {
      const visitorId = getOrCreateVisitorId();
      const params = new URLSearchParams({
        event_type: eventType,
        visitor_id: visitorId,
        source: document.referrer ? new URL(document.referrer).hostname : 'direct',
        bot_id: botId,
      });
      const metadata = {
        device: getDeviceType(),
        page: window.location.href,
        bot_id: botId,
        ...additionalData,
      };
      fetch(`${API_BASE}/marketing/track-conversion?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
        keepalive: true,
      }).catch(() => {});
    } catch (e) {
      // Silently fail
    }
  }

  // Default config
  let config = {
    name: 'ZAIA Chat',
    welcome_message: 'Hello! How can I help you today?',
    primary_color: '#3B82F6',
    text_color: '#FFFFFF',
    position: 'bottom-right'
  };

  // Handoff config
  let handoffConfig = {
    enabled: false,
    offline_message: 'Our team is currently offline.'
  };

  let isOpen = false;
  let sessionId = null;
  let messages = [];
  let isInHandoff = false;
  let handoffWs = null;
  let handoffData = null;

  // Lead capture state
  let leadConfig = null;
  let showLeadForm = false;
  let leadSubmitted = false;

  // Create styles
  const styles = document.createElement('style');
  styles.textContent = `
    .zaia-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      position: fixed;
      z-index: 999999;
      touch-action: manipulation;
    }
    .zaia-widget * {
      touch-action: manipulation;
    }
    .zaia-widget.bottom-right {
      bottom: 20px;
      right: 20px;
    }
    .zaia-widget.bottom-left {
      bottom: 20px;
      left: 20px;
    }
    .zaia-toggle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .zaia-toggle:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }
    .zaia-toggle svg {
      width: 28px;
      height: 28px;
    }
    .zaia-chat-window {
      position: absolute;
      bottom: 80px;
      width: 380px;
      height: 520px;
      max-height: calc(100vh - 120px);
      max-width: calc(100vw - 40px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    @media (max-width: 480px) {
      .zaia-chat-window {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        border-radius: 0;
        z-index: 9999999;
      }
      .zaia-widget.bottom-right, .zaia-widget.bottom-left {
        bottom: 16px;
        right: 16px;
        left: auto;
      }
      .zaia-toggle {
        width: 56px;
        height: 56px;
      }
      .zaia-toggle svg {
        width: 26px;
        height: 26px;
      }
      .zaia-header {
        padding: 14px 16px;
        padding-top: max(14px, env(safe-area-inset-top));
      }
      .zaia-input-area {
        padding: 12px;
        padding-bottom: max(12px, env(safe-area-inset-bottom));
      }
      .zaia-messages {
        padding: 12px;
      }
      .zaia-input {
        font-size: 16px;
      }
    }
    .zaia-widget.bottom-right .zaia-chat-window {
      right: 0;
    }
    .zaia-widget.bottom-left .zaia-chat-window {
      left: 0;
    }
    .zaia-chat-window.open {
      display: flex;
    }
    .zaia-header {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .zaia-header-title {
      font-weight: 600;
      font-size: 16px;
    }
    .zaia-header-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      opacity: 0.9;
    }
    .zaia-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
    }
    .zaia-status-dot.pending {
      background: #eab308;
    }
    .zaia-close {
      background: rgba(255,255,255,0.2);
      border: none;
      padding: 6px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
    }
    .zaia-close svg {
      width: 18px;
      height: 18px;
    }
    .zaia-messages {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 16px;
      background: #f9fafb;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-y: contain;
      scrollbar-width: thin;
      scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
    }
    .zaia-messages::-webkit-scrollbar {
      width: 4px;
    }
    .zaia-messages::-webkit-scrollbar-track {
      background: transparent;
    }
    .zaia-messages::-webkit-scrollbar-thumb {
      background-color: rgba(156, 163, 175, 0.5);
      border-radius: 2px;
    }
    .zaia-message {
      margin-bottom: 12px;
      display: flex;
    }
    .zaia-message.user {
      justify-content: flex-end;
    }
    .zaia-message-content {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
    }
    .zaia-message.bot .zaia-message-content {
      background: white;
      color: #374151;
      border-bottom-left-radius: 4px;
    }
    .zaia-message.agent .zaia-message-content {
      background: #dcfce7;
      color: #166534;
      border-bottom-left-radius: 4px;
    }
    .zaia-message.user .zaia-message-content {
      border-bottom-right-radius: 4px;
    }
    .zaia-message-sender {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .zaia-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
      background: white;
      border-radius: 16px;
      width: fit-content;
    }
    .zaia-typing span {
      width: 8px;
      height: 8px;
      background: #9ca3af;
      border-radius: 50%;
      animation: typing 1.4s infinite;
    }
    .zaia-typing span:nth-child(2) { animation-delay: 0.2s; }
    .zaia-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
    }
    .zaia-input-area {
      padding: 16px;
      border-top: 1px solid #e5e7eb;
      background: white;
      flex-shrink: 0;
    }
    .zaia-input-form {
      display: flex;
      gap: 8px;
    }
    .zaia-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      font-size: 16px;
      outline: none;
      transition: border-color 0.2s;
      color: #374151 !important;
      background-color: #ffffff !important;
    }
    .zaia-input::placeholder {
      color: #9ca3af !important;
    }
    .zaia-input:focus {
      border-color: #3b82f6;
    }
    .zaia-send {
      padding: 12px 16px;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .zaia-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .zaia-send svg {
      width: 20px;
      height: 20px;
    }
    .zaia-powered {
      text-align: center;
      padding: 8px;
      font-size: 11px;
      color: #9ca3af;
      background: white;
      flex-shrink: 0;
    }
    .zaia-powered a {
      color: #6b7280;
      text-decoration: none;
    }
    .zaia-handoff-btn {
      width: 100%;
      padding: 10px;
      margin-top: 8px;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      color: #374151;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .zaia-handoff-btn:hover {
      background: #e5e7eb;
    }
    .zaia-handoff-notice {
      text-align: center;
      padding: 12px;
      background: #fef3c7;
      color: #92400e;
      font-size: 13px;
      border-bottom: 1px solid #fcd34d;
    }
    .zaia-handoff-notice.active {
      background: #dcfce7;
      color: #166534;
      border-bottom: 1px solid #86efac;
    }
    .zaia-divider {
      text-align: center;
      padding: 12px 0;
      font-size: 11px;
      color: #9ca3af;
    }
    .zaia-divider::before,
    .zaia-divider::after {
      content: '';
      display: inline-block;
      width: 30px;
      height: 1px;
      background: #e5e7eb;
      vertical-align: middle;
      margin: 0 8px;
    }
    .zaia-lead-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000000;
    }
    .zaia-lead-modal {
      background: white;
      border-radius: 16px;
      max-width: 380px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      position: relative;
    }
    .zaia-lead-header {
      padding: 20px;
      border-bottom: 1px solid #e5e7eb;
    }
    .zaia-lead-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }
    .zaia-lead-header p {
      margin: 8px 0 0;
      font-size: 14px;
      color: #6b7280;
    }
    .zaia-lead-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: #6b7280;
    }
    .zaia-lead-close:hover {
      color: #1f2937;
    }
    .zaia-lead-form {
      padding: 20px;
    }
    .zaia-lead-field {
      margin-bottom: 16px;
    }
    .zaia-lead-field label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }
    .zaia-lead-field input,
    .zaia-lead-field textarea,
    .zaia-lead-field select {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
      color: #374151;
      background: white;
    }
    .zaia-lead-field input:focus,
    .zaia-lead-field textarea:focus,
    .zaia-lead-field select:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
    }
    .zaia-lead-submit {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .zaia-lead-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .zaia-lead-required {
      color: #ef4444;
    }
    .zaia-lead-error {
      color: #ef4444;
      font-size: 13px;
      margin-top: 8px;
      text-align: center;
    }
  `;
  document.head.appendChild(styles);

  // Create widget HTML
  const widget = document.createElement('div');
  widget.className = `zaia-widget ${config.position}`;
  widget.innerHTML = `
    <div class="zaia-chat-window">
      <div class="zaia-header">
        <div>
          <span class="zaia-header-title"></span>
          <div class="zaia-header-status" style="display:none">
            <span class="zaia-status-dot"></span>
            <span class="zaia-status-text">Connected</span>
          </div>
        </div>
        <button class="zaia-close">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="zaia-handoff-notice" style="display:none"></div>
      <div class="zaia-messages"></div>
      <div class="zaia-input-area">
        <form class="zaia-input-form">
          <input type="text" class="zaia-input" placeholder="Type your message..." />
          <button type="submit" class="zaia-send">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          </button>
        </form>
        <button class="zaia-handoff-btn" style="display:none">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          Talk to a human
        </button>
      </div>
      <div class="zaia-powered">Powered by <a href="https://chatbot.zaiasystems.com" target="_blank">ZAIA</a></div>
    </div>
    <button class="zaia-toggle">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
    </button>
  `;

  document.body.appendChild(widget);

  // Get elements
  const toggle = widget.querySelector('.zaia-toggle');
  const chatWindow = widget.querySelector('.zaia-chat-window');
  const closeBtn = widget.querySelector('.zaia-close');
  const messagesContainer = widget.querySelector('.zaia-messages');
  const form = widget.querySelector('.zaia-input-form');
  const input = widget.querySelector('.zaia-input');
  const sendBtn = widget.querySelector('.zaia-send');
  const header = widget.querySelector('.zaia-header');
  const headerTitle = widget.querySelector('.zaia-header-title');
  const headerStatus = widget.querySelector('.zaia-header-status');
  const statusDot = widget.querySelector('.zaia-status-dot');
  const statusText = widget.querySelector('.zaia-status-text');
  const handoffBtn = widget.querySelector('.zaia-handoff-btn');
  const handoffNotice = widget.querySelector('.zaia-handoff-notice');

  // Set initial title safely
  if (headerTitle) headerTitle.textContent = config.name;

  // Load config
  async function loadConfig() {
    try {
      const response = await fetch(`${API_BASE}/chat/${botId}/config`);
      if (response.ok) {
        config = await response.json();
        applyConfig();
      }
    } catch (error) {
      console.error('ZAIA Chat: Failed to load config', error);
    }

    // Load handoff config
    try {
      const response = await fetch(`${API_BASE}/handoff/${botId}/public-config`);
      if (response.ok) {
        handoffConfig = await response.json();
        if (handoffConfig.enabled) {
          handoffBtn.style.display = 'flex';
        }
      }
    } catch (error) {
      console.error('ZAIA Chat: Failed to load handoff config', error);
    }

    // Load lead form config
    try {
      const response = await fetch(`${API_BASE}/leads/${botId}/public-form-config`);
      if (response.ok) {
        leadConfig = await response.json();
      }
    } catch (error) {
      console.error('ZAIA Chat: Failed to load lead config', error);
    }
  }

  function applyConfig() {
    toggle.style.backgroundColor = config.primary_color;
    toggle.querySelector('svg').style.color = config.text_color;
    header.style.backgroundColor = config.primary_color;
    header.style.color = config.text_color;
    headerTitle.textContent = config.name;
    closeBtn.querySelector('svg').style.color = config.text_color;
    sendBtn.style.backgroundColor = config.primary_color;
    sendBtn.querySelector('svg').style.color = config.text_color;
    widget.className = `zaia-widget ${config.position}`;

    // Show welcome message
    if (messages.length === 0 && config.welcome_message) {
      addMessage(config.welcome_message, 'bot');
    }
  }

  // Smooth scroll to bottom helper
  function smoothScrollToBottom() {
    requestAnimationFrame(() => {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    });
  }

  function addMessage(content, type, isStreaming = false) {
    messages.push({ content, type });
    const msgDiv = document.createElement('div');
    msgDiv.className = `zaia-message ${type}`;

    const bgStyle = type === 'user' ? `style="background-color: ${config.primary_color}; color: ${config.text_color}"` : '';
    msgDiv.innerHTML = `<div class="zaia-message-content" ${bgStyle}><span class="zaia-msg-text">${escapeHtml(content)}</span></div>`;
    messagesContainer.appendChild(msgDiv);
    smoothScrollToBottom();
    return msgDiv;  // Return element for streaming updates
  }

  function formatMessage(text) {
    // First escape HTML to prevent XSS
    const escaped = escapeHtml(text);
    // Then apply safe formatting
    return escaped
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  function addDivider(text) {
    const divider = document.createElement('div');
    divider.className = 'zaia-divider';
    divider.textContent = text;
    messagesContainer.appendChild(divider);
    smoothScrollToBottom();
  }

  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'zaia-message bot zaia-typing-msg';
    typing.innerHTML = '<div class="zaia-typing"><span></span><span></span><span></span></div>';
    messagesContainer.appendChild(typing);
    smoothScrollToBottom();
  }

  function hideTyping() {
    const typing = messagesContainer.querySelector('.zaia-typing-msg');
    if (typing) typing.remove();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Lead form functions
  function createLeadFormModal() {
    // Remove existing modal if present
    const existing = document.querySelector('.zaia-lead-overlay');
    if (existing) existing.remove();

    if (!leadConfig || !leadConfig.enabled || leadSubmitted) return null;

    const overlay = document.createElement('div');
    overlay.className = 'zaia-lead-overlay';

    const fieldsHtml = (leadConfig.fields || []).map(field => {
      const requiredSpan = field.required ? '<span class="zaia-lead-required">*</span>' : '';
      const placeholder = escapeHtml(field.placeholder || '');

      if (field.type === 'textarea') {
        return `<div class="zaia-lead-field">
          <label>${escapeHtml(field.label)} ${requiredSpan}</label>
          <textarea name="${field.id}" ${field.required ? 'required' : ''} placeholder="${placeholder}" rows="3"></textarea>
        </div>`;
      } else if (field.type === 'select') {
        const options = (field.options || []).map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
        return `<div class="zaia-lead-field">
          <label>${escapeHtml(field.label)} ${requiredSpan}</label>
          <select name="${field.id}" ${field.required ? 'required' : ''}>
            <option value="">Select...</option>
            ${options}
          </select>
        </div>`;
      } else {
        return `<div class="zaia-lead-field">
          <label>${escapeHtml(field.label)} ${requiredSpan}</label>
          <input type="${field.type || 'text'}" name="${field.id}" ${field.required ? 'required' : ''} placeholder="${placeholder}"/>
        </div>`;
      }
    }).join('');

    overlay.innerHTML = `
      <div class="zaia-lead-modal">
        <button class="zaia-lead-close">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <div class="zaia-lead-header">
          <h3>${escapeHtml(leadConfig.title || 'Get in touch')}</h3>
          ${leadConfig.description ? `<p>${escapeHtml(leadConfig.description)}</p>` : ''}
        </div>
        <form class="zaia-lead-form">
          ${fieldsHtml}
          <button type="submit" class="zaia-lead-submit" style="background-color: ${config.primary_color}">
            ${escapeHtml(leadConfig.submit_button_text || 'Submit')}
          </button>
        </form>
      </div>
    `;

    // Close button handler
    overlay.querySelector('.zaia-lead-close').addEventListener('click', () => {
      overlay.remove();
      showLeadForm = false;
    });

    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        showLeadForm = false;
      }
    });

    // Form submit handler
    overlay.querySelector('.zaia-lead-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitLeadForm(e.target, overlay);
    });

    return overlay;
  }

  async function submitLeadForm(form, overlay) {
    const submitBtn = form.querySelector('.zaia-lead-submit');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    // Collect form data
    const fields = {};
    (leadConfig.fields || []).forEach(field => {
      const input = form.querySelector(`[name="${field.id}"]`);
      if (input) {
        fields[field.id] = input.value;
      }
    });

    try {
      const response = await fetch(`${API_BASE}/leads/${botId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: fields,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      const result = await response.json();
      leadSubmitted = true;
      showLeadForm = false;
      overlay.remove();

      // Show success message
      addMessage(result.message || leadConfig.success_message || "Thanks! We'll be in touch soon.", 'bot');

      // Track conversion
      trackMarketingEvent('lead_captured', { session_id: sessionId });

    } catch (error) {
      console.error('ZAIA Chat: Lead submission failed', error);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      // Show inline error
      let errorEl = form.querySelector('.zaia-lead-error');
      if (!errorEl) {
        errorEl = document.createElement('p');
        errorEl.className = 'zaia-lead-error';
        form.appendChild(errorEl);
      }
      errorEl.textContent = 'Failed to submit. Please try again.';
    }
  }

  function showLeadFormModal() {
    if (showLeadForm || leadSubmitted || !leadConfig?.enabled) return;
    showLeadForm = true;
    const modal = createLeadFormModal();
    if (modal) {
      document.body.appendChild(modal);
    }
  }

  function updateHandoffStatus(status, agentName) {
    headerStatus.style.display = 'flex';

    if (status === 'pending') {
      statusDot.className = 'zaia-status-dot pending';
      statusText.textContent = 'Waiting for agent...';
      handoffNotice.textContent = 'Please wait, an agent will be with you shortly.';
      handoffNotice.className = 'zaia-handoff-notice';
      handoffNotice.style.display = 'block';
    } else if (status === 'assigned' || status === 'active') {
      statusDot.className = 'zaia-status-dot';
      statusText.textContent = agentName ? `Chatting with ${agentName}` : 'Connected';
      handoffNotice.textContent = agentName ? `You're now chatting with ${agentName}` : 'Connected to an agent';
      handoffNotice.className = 'zaia-handoff-notice active';
      handoffNotice.style.display = 'block';
    } else if (status === 'timeout_collecting') {
      statusDot.className = 'zaia-status-dot pending';
      statusText.textContent = 'AI Assistant';
      handoffNotice.textContent = 'Our team is unavailable. Please share your contact details.';
      handoffNotice.className = 'zaia-handoff-notice';
      handoffNotice.style.display = 'block';
    } else if (status === 'resolved') {
      headerStatus.style.display = 'none';
      handoffNotice.style.display = 'none';
      isInHandoff = false;
      handoffBtn.style.display = handoffConfig.enabled ? 'flex' : 'none';
      addDivider('Chat ended');
    }
  }

  // WebSocket connection for handoff
  function connectHandoffWebSocket() {
    if (!sessionId) return;

    const wsUrl = `${WS_BASE}/handoff/${botId}/session/${sessionId}/ws`;
    handoffWs = new WebSocket(wsUrl);

    handoffWs.onopen = () => {
      console.log('ZAIA Chat: Handoff WebSocket connected');
    };

    handoffWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'init') {
          handoffData = data;
          updateHandoffStatus(data.status, data.assigned_to_name);

          // Show existing handoff messages
          if (data.messages && data.messages.length > 0) {
            addDivider('Live Chat Started');
            data.messages.forEach(msg => {
              // Handle visitor, agent, and bot messages
              let type = 'agent';
              if (msg.sender_type === 'visitor') type = 'user';
              else if (msg.sender_type === 'bot') type = 'bot';
              addMessage(msg.content, type, false);
            });
          }
        } else if (data.type === 'timeout_initiated') {
          // Timeout triggered - AI taking over
          updateHandoffStatus('timeout_collecting');
          if (data.message) {
            addMessage(data.message.content, 'bot', false);
          }
        } else if (data.type === 'message') {
          const msg = data.message;
          // Show agent and bot messages (visitor messages are already shown)
          if (msg.sender_type === 'agent') {
            addMessage(msg.content, 'agent', false);
          } else if (msg.sender_type === 'bot') {
            addMessage(msg.content, 'bot', false);
          }
        } else if (data.type === 'status_change') {
          updateHandoffStatus(data.status, handoffData?.assigned_to_name);
        }
      } catch (e) {
        console.error('Invalid WebSocket message:', e);
        return;
      }
    };

    handoffWs.onclose = () => {
      console.log('ZAIA Chat: Handoff WebSocket disconnected');
      // Try to reconnect if still in handoff
      if (isInHandoff) {
        setTimeout(connectHandoffWebSocket, 3000);
      }
    };

    handoffWs.onerror = (error) => {
      console.error('ZAIA Chat: Handoff WebSocket error', error);
    };

    // Keep alive ping
    setInterval(() => {
      if (handoffWs && handoffWs.readyState === WebSocket.OPEN) {
        handoffWs.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  async function requestHandoff() {
    if (!sessionId) {
      addMessage('Please send a message first before requesting human assistance.', 'bot');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/handoff/${botId}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          trigger: 'user_request',
          reason: 'User requested human assistance'
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to request handoff');
      }

      const data = await response.json();
      isInHandoff = true;
      handoffBtn.style.display = 'none';

      addDivider('Connecting to agent');
      addMessage(data.message || 'Your request has been received. An agent will be with you shortly.', 'bot');

      updateHandoffStatus('pending');

      // Connect WebSocket for real-time updates
      connectHandoffWebSocket();

    } catch (error) {
      console.error('ZAIA Chat: Handoff request failed', error);
      addMessage(error.message || 'Unable to connect to a human agent right now. Please try again later.', 'bot');
    }
  }

  async function sendMessage(message) {
    addMessage(message, 'user');
    input.value = '';
    sendBtn.disabled = true;

    // Track first message
    messageCount++;
    if (messageCount === 1) {
      trackMarketingEvent('chat_message_sent', { first_message: true });
    }

    // If in handoff, send via WebSocket
    if (isInHandoff && handoffWs && handoffWs.readyState === WebSocket.OPEN) {
      handoffWs.send(JSON.stringify({
        type: 'message',
        content: message
      }));
      sendBtn.disabled = false;
      return;
    }

    // Otherwise send to bot using streaming for faster response
    showTyping();

    try {
      const response = await fetch(`${API_BASE}/chat/${botId}/message/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          session_id: sessionId
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let streamingMsgEl = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.session_id) {
                sessionId = parsed.session_id;
              }
              if (parsed.content) {
                fullContent += parsed.content;

                // Create message element on first content (replaces typing indicator)
                if (!streamingMsgEl) {
                  hideTyping();
                  streamingMsgEl = addMessage(fullContent, 'bot', true);
                } else {
                  // Update message content in real-time
                  const contentEl = streamingMsgEl.querySelector('.zaia-msg-text');
                  if (contentEl) {
                    contentEl.innerHTML = formatMessage(fullContent);
                  }
                }
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Check for smart lead form trigger [SHOW_LEAD_FORM]
      if (fullContent.includes('[SHOW_LEAD_FORM]')) {
        // Strip the marker from displayed content
        const contentEl = streamingMsgEl?.querySelector('.zaia-msg-text');
        if (contentEl) {
          const cleanContent = fullContent.replace(/\[SHOW_LEAD_FORM\]/g, '').trim();
          contentEl.innerHTML = formatMessage(cleanContent);
        }

        // Show lead form if smart capture is enabled
        if (leadConfig?.enabled && leadConfig?.smart_capture && !leadSubmitted) {
          setTimeout(() => {
            showLeadFormModal();
          }, 500);
        }
      }

      // Check after_messages trigger
      if (leadConfig?.enabled &&
          leadConfig?.trigger === 'after_messages' &&
          !leadSubmitted &&
          messageCount >= (leadConfig.trigger_after_messages || 3)) {
        setTimeout(() => {
          showLeadFormModal();
        }, 1000);
      }

      // Check if we should show handoff button after a few messages
      if (handoffConfig.enabled && messages.filter(m => m.type === 'user').length >= 2) {
        handoffBtn.style.display = 'flex';
      }
    } catch (error) {
      hideTyping();
      addMessage('Sorry, something went wrong. Please try again.', 'bot');
      console.error('ZAIA Chat:', error);
    } finally {
      sendBtn.disabled = false;
    }
  }

  // Check for existing handoff on load
  async function checkExistingHandoff() {
    if (!sessionId) return;

    try {
      const response = await fetch(`${API_BASE}/handoff/${botId}/session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.active) {
          isInHandoff = true;
          handoffBtn.style.display = 'none';
          updateHandoffStatus(data.handoff.status, data.handoff.assigned_to_name);
          connectHandoffWebSocket();
        }
      }
    } catch (error) {
      console.error('ZAIA Chat: Failed to check handoff status', error);
    }
  }

  // Event listeners
  toggle.addEventListener('click', () => {
    isOpen = !isOpen;
    chatWindow.classList.toggle('open', isOpen);
    if (isOpen) {
      input.focus();
      // Track chat opened (only first time)
      if (!chatOpened) {
        chatOpened = true;
        trackMarketingEvent('chat_opened');
      }
      // Check for existing handoff when opening
      if (sessionId) {
        checkExistingHandoff();
      }
    }
  });

  closeBtn.addEventListener('click', () => {
    isOpen = false;
    chatWindow.classList.remove('open');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (message) {
      sendMessage(message);
    }
  });

  handoffBtn.addEventListener('click', () => {
    requestHandoff();
  });

  // Session timeout configuration (30 minutes default)
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  function getSessionData() {
    try {
      const data = localStorage.getItem(`zaia_session_${botId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function saveSessionData() {
    if (sessionId) {
      localStorage.setItem(`zaia_session_${botId}`, JSON.stringify({
        id: sessionId,
        lastActivity: Date.now()
      }));
    }
  }

  function clearSession() {
    sessionId = null;
    messages = [];
    isInHandoff = false;
    if (handoffWs) {
      handoffWs.close();
      handoffWs = null;
    }
    localStorage.removeItem(`zaia_session_${botId}`);
    // Clear chat UI
    const messagesContainer = document.querySelector('.zaia-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
    }
  }

  function isSessionExpired(sessionData) {
    if (!sessionData || !sessionData.lastActivity) return true;
    return (Date.now() - sessionData.lastActivity) > SESSION_TIMEOUT_MS;
  }

  // Initialize
  loadConfig();

  // Try to restore session (with timeout check)
  const savedSessionData = getSessionData();
  if (savedSessionData && !isSessionExpired(savedSessionData)) {
    sessionId = savedSessionData.id;
    // Update activity timestamp
    saveSessionData();
  } else if (savedSessionData) {
    // Session expired - clear it
    clearSession();
    console.log('ZAIA Chat: Session expired, starting fresh');
  }

  // Save session on message
  const originalSendMessage = sendMessage;
  sendMessage = async function(message) {
    await originalSendMessage(message);
    saveSessionData();
  };

  // Update activity on chat open
  const originalToggle = toggle.onclick;
  toggle.onclick = function() {
    if (sessionId) saveSessionData();
    if (originalToggle) originalToggle.call(this);
  };
})();
