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
    @media (max-width: 420px) {
      .zaia-chat-window {
        width: calc(100vw - 24px);
        height: calc(100vh - 100px);
        bottom: 70px;
        right: 12px !important;
        left: 12px !important;
        border-radius: 12px;
      }
      .zaia-widget.bottom-right, .zaia-widget.bottom-left {
        bottom: 12px;
        right: 12px;
        left: auto;
      }
      .zaia-toggle {
        width: 52px;
        height: 52px;
      }
      .zaia-toggle svg {
        width: 24px;
        height: 24px;
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
  `;
  document.head.appendChild(styles);

  // Create widget HTML
  const widget = document.createElement('div');
  widget.className = `zaia-widget ${config.position}`;
  widget.innerHTML = `
    <div class="zaia-chat-window">
      <div class="zaia-header">
        <div>
          <span class="zaia-header-title">${config.name}</span>
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
    // Simple markdown-like formatting for streaming
    return escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
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
      const data = JSON.parse(event.data);

      if (data.type === 'init') {
        handoffData = data;
        updateHandoffStatus(data.status, data.assigned_to_name);

        // Show existing handoff messages
        if (data.messages && data.messages.length > 0) {
          addDivider('Live Chat Started');
          data.messages.forEach(msg => {
            const type = msg.sender_type === 'visitor' ? 'user' : 'agent';
            addMessage(msg.content, type, msg.sender_type === 'agent' ? msg.sender_name : null);
          });
        }
      } else if (data.type === 'message') {
        const msg = data.message;
        // Only show agent messages (our messages are already shown)
        if (msg.sender_type === 'agent') {
          addMessage(msg.content, 'agent', msg.sender_name || 'Agent');
        }
      } else if (data.type === 'status_change') {
        updateHandoffStatus(data.status, handoffData?.assigned_to_name);
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

  // Initialize
  loadConfig();

  // Try to restore session
  const savedSession = localStorage.getItem(`zaia_session_${botId}`);
  if (savedSession) {
    sessionId = savedSession;
  }

  // Save session on message
  const originalSendMessage = sendMessage;
  sendMessage = async function(message) {
    await originalSendMessage(message);
    if (sessionId) {
      localStorage.setItem(`zaia_session_${botId}`, sessionId);
    }
  };
})();
