import { ZaiaConfig, Message } from './types';
import { ChatAPI } from './api';

export class ChatWidget {
  private config: ZaiaConfig;
  private api: ChatAPI;
  private container: HTMLElement | null = null;
  private isOpen: boolean = false;
  private messages: Message[] = [];
  private isLoading: boolean = false;

  constructor(config: ZaiaConfig, api: ChatAPI) {
    this.config = {
      position: 'bottom-right',
      theme: 'light',
      primaryColor: '#4F46E5',
      welcomeMessage: 'Hello! How can I help you today?',
      placeholderText: 'Type your message...',
      showBranding: true,
      ...config
    };
    this.api = api;
  }

  mount(): void {
    this.createWidget();
    this.loadHistory();
  }

  private async loadHistory(): Promise<void> {
    try {
      const history = await this.api.getHistory();
      if (history.messages.length > 0) {
        this.messages = history.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources,
          timestamp: new Date(m.timestamp),
          feedback: m.feedback
        }));
        this.renderMessages();
      } else {
        // Add welcome message
        this.addMessage({
          id: 'welcome',
          role: 'assistant',
          content: this.config.welcomeMessage!,
          timestamp: new Date()
        });
      }
    } catch (e) {
      // Add welcome message on error
      this.addMessage({
        id: 'welcome',
        role: 'assistant',
        content: this.config.welcomeMessage!,
        timestamp: new Date()
      });
    }
  }

  private createWidget(): void {
    const isDark = this.config.theme === 'dark' ||
      (this.config.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'zaia-chat-widget';
    this.container.className = `zaia-widget ${isDark ? 'zaia-dark' : 'zaia-light'}`;
    this.container.setAttribute('data-position', this.config.position || 'bottom-right');

    this.container.innerHTML = `
      <button class="zaia-trigger" aria-label="Open chat">
        <svg class="zaia-icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path>
        </svg>
        <svg class="zaia-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
      <div class="zaia-chat-window">
        <div class="zaia-header">
          <div class="zaia-header-title">
            <span class="zaia-status-dot"></span>
            <span>Chat Assistant</span>
          </div>
          <button class="zaia-header-close" aria-label="Close chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="zaia-messages" role="log" aria-live="polite"></div>
        <div class="zaia-input-area">
          <form class="zaia-input-form">
            <input
              type="text"
              class="zaia-input"
              placeholder="${this.config.placeholderText}"
              aria-label="Message input"
            />
            <button type="submit" class="zaia-send-btn" aria-label="Send message">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
              </svg>
            </button>
          </form>
          ${this.config.showBranding ? '<div class="zaia-branding">Powered by ZAIA</div>' : ''}
        </div>
      </div>
    `;

    // Apply custom primary color
    if (this.config.primaryColor) {
      this.container.style.setProperty('--zaia-primary', this.config.primaryColor);
    }

    document.body.appendChild(this.container);
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    if (!this.container) return;

    // Toggle button
    const trigger = this.container.querySelector('.zaia-trigger');
    trigger?.addEventListener('click', () => this.toggle());

    // Close button in header
    const closeBtn = this.container.querySelector('.zaia-header-close');
    closeBtn?.addEventListener('click', () => this.close());

    // Form submission
    const form = this.container.querySelector('.zaia-input-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = this.container?.querySelector('.zaia-input') as HTMLInputElement;
      if (input?.value.trim()) {
        this.sendMessage(input.value.trim());
        input.value = '';
      }
    });

    // Enter key handling
    const input = this.container.querySelector('.zaia-input');
    input?.addEventListener('keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
        e.preventDefault();
        form?.dispatchEvent(new Event('submit'));
      }
    });
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    this.isOpen = true;
    this.container?.classList.add('zaia-open');
    const input = this.container?.querySelector('.zaia-input') as HTMLInputElement;
    input?.focus();
  }

  close(): void {
    this.isOpen = false;
    this.container?.classList.remove('zaia-open');
  }

  async sendMessage(content: string): Promise<void> {
    if (this.isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    };
    this.addMessage(userMessage);

    // Show loading
    this.setLoading(true);

    try {
      const response = await this.api.sendMessage(content);

      // Add assistant message
      const assistantMessage: Message = {
        id: response.message.id,
        role: 'assistant',
        content: response.message.content,
        sources: response.sources,
        timestamp: new Date(response.message.timestamp)
      };
      this.addMessage(assistantMessage);
    } catch (error) {
      // Add error message
      this.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      });
    } finally {
      this.setLoading(false);
    }
  }

  private addMessage(message: Message): void {
    this.messages.push(message);
    this.renderMessage(message);
    this.scrollToBottom();
  }

  private renderMessages(): void {
    const container = this.container?.querySelector('.zaia-messages');
    if (!container) return;
    container.innerHTML = '';
    this.messages.forEach(msg => this.renderMessage(msg));
    this.scrollToBottom();
  }

  private renderMessage(message: Message): void {
    const container = this.container?.querySelector('.zaia-messages');
    if (!container) return;

    const msgEl = document.createElement('div');
    msgEl.className = `zaia-message zaia-message-${message.role}`;
    msgEl.setAttribute('data-id', message.id);

    const contentHtml = this.formatContent(message.content);

    msgEl.innerHTML = `
      <div class="zaia-message-content">${contentHtml}</div>
      ${message.sources && message.sources.length > 0 ? `
        <div class="zaia-message-sources">
          <button class="zaia-sources-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"></path>
              <path d="M13 2v7h7"></path>
            </svg>
            Sources (${message.sources.length})
          </button>
          <div class="zaia-sources-list" hidden>
            ${message.sources.map((s, i) => `
              <div class="zaia-source-item">
                <span class="zaia-source-num">[${i + 1}]</span>
                <span class="zaia-source-text">${this.escapeHtml(s.text.substring(0, 150))}...</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      ${message.role === 'assistant' && message.id !== 'welcome' ? `
        <div class="zaia-message-feedback">
          <button class="zaia-feedback-btn" data-feedback="positive" aria-label="Helpful">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"></path>
            </svg>
          </button>
          <button class="zaia-feedback-btn" data-feedback="negative" aria-label="Not helpful">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"></path>
            </svg>
          </button>
        </div>
      ` : ''}
    `;

    // Attach feedback handlers
    msgEl.querySelectorAll('.zaia-feedback-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const feedback = (e.currentTarget as HTMLElement).dataset.feedback as 'positive' | 'negative';
        this.submitFeedback(message.id, feedback);
        msgEl.querySelectorAll('.zaia-feedback-btn').forEach(b => b.classList.remove('zaia-active'));
        (e.currentTarget as HTMLElement).classList.add('zaia-active');
      });
    });

    // Attach sources toggle
    const sourcesToggle = msgEl.querySelector('.zaia-sources-toggle');
    const sourcesList = msgEl.querySelector('.zaia-sources-list');
    sourcesToggle?.addEventListener('click', () => {
      sourcesList?.toggleAttribute('hidden');
    });

    container.appendChild(msgEl);
  }

  private formatContent(content: string): string {
    // Basic markdown-like formatting
    let html = this.escapeHtml(content);

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    const container = this.container?.querySelector('.zaia-messages');

    if (loading) {
      const loader = document.createElement('div');
      loader.className = 'zaia-message zaia-message-assistant zaia-loading';
      loader.innerHTML = `
        <div class="zaia-typing-indicator">
          <span></span><span></span><span></span>
        </div>
      `;
      container?.appendChild(loader);
      this.scrollToBottom();
    } else {
      container?.querySelector('.zaia-loading')?.remove();
    }
  }

  private scrollToBottom(): void {
    const container = this.container?.querySelector('.zaia-messages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  private async submitFeedback(messageId: string, feedback: 'positive' | 'negative'): Promise<void> {
    try {
      await this.api.submitFeedback(messageId, feedback);
    } catch (e) {
      console.error('Failed to submit feedback:', e);
    }
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
