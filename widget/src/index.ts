import './styles.css';
import { ChatWidget } from './widget';
import { ChatAPI } from './api';
import { ZaiaConfig, ZaiaInstance } from './types';

declare global {
  interface Window {
    ZaiaChat: ZaiaInstance;
    zaia: (command: string, config?: ZaiaConfig) => void;
  }
}

let widgetInstance: ChatWidget | null = null;

/**
 * Initialize the ZAIA Chat widget
 */
function init(config: ZaiaConfig): void {
  if (widgetInstance) {
    console.warn('ZAIA Chat already initialized');
    return;
  }

  if (!config.botId || !config.apiKey) {
    console.error('ZAIA Chat: botId and apiKey are required');
    return;
  }

  const api = new ChatAPI(config);
  widgetInstance = new ChatWidget(config, api);
  widgetInstance.mount();
}

/**
 * Open the chat widget
 */
function open(): void {
  if (widgetInstance) {
    widgetInstance.open();
  }
}

/**
 * Close the chat widget
 */
function close(): void {
  if (widgetInstance) {
    widgetInstance.close();
  }
}

/**
 * Destroy the widget instance
 */
function destroy(): void {
  if (widgetInstance) {
    widgetInstance.destroy();
    widgetInstance = null;
  }
}

/**
 * Send a message programmatically
 */
function sendMessage(message: string): void {
  if (widgetInstance) {
    widgetInstance.sendMessage(message);
  }
}

// Export the ZaiaChat object
const ZaiaChat: ZaiaInstance = {
  init,
  open,
  close,
  destroy,
  sendMessage
};

// Process queued commands
if (window.zaia && Array.isArray((window.zaia as any).q)) {
  const queue = (window.zaia as any).q;
  queue.forEach((args: [string, ZaiaConfig?]) => {
    const [command, config] = args;
    if (command === 'init' && config) {
      ZaiaChat.init(config);
    }
  });
}

// Expose to window
window.ZaiaChat = ZaiaChat;

export default ZaiaChat;
