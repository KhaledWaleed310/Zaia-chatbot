import { ZaiaConfig, ChatResponse } from './types';

export class ChatAPI {
  private config: ZaiaConfig;
  private baseUrl: string;
  private sessionId: string | null = null;

  constructor(config: ZaiaConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.zaia.ai';

    // Try to restore session from localStorage
    const storedSession = localStorage.getItem(`zaia_session_${config.botId}`);
    if (storedSession) {
      this.sessionId = storedSession;
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  async sendMessage(message: string): Promise<ChatResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/chat/${this.config.botId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        body: JSON.stringify({
          message,
          session_id: this.sessionId
        })
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to send message');
    }

    const data: ChatResponse = await response.json();

    // Store session ID
    if (data.session_id) {
      this.sessionId = data.session_id;
      localStorage.setItem(`zaia_session_${this.config.botId}`, data.session_id);
    }

    return data;
  }

  async *sendMessageStream(message: string): AsyncGenerator<string, void, unknown> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/chat/${this.config.botId}/message/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        body: JSON.stringify({
          message,
          session_id: this.sessionId
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.chunk) {
            yield data.chunk;
          }
          if (data.session_id) {
            this.sessionId = data.session_id;
            localStorage.setItem(`zaia_session_${this.config.botId}`, data.session_id);
          }
        }
      }
    }
  }

  async getHistory(): Promise<{ messages: any[] }> {
    if (!this.sessionId) {
      return { messages: [] };
    }

    const response = await fetch(
      `${this.baseUrl}/api/v1/chat/${this.config.botId}/history/${this.sessionId}`,
      {
        headers: {
          'X-API-Key': this.config.apiKey
        }
      }
    );

    if (!response.ok) {
      return { messages: [] };
    }

    return response.json();
  }

  async submitFeedback(messageId: string, feedback: 'positive' | 'negative'): Promise<void> {
    if (!this.sessionId) return;

    await fetch(
      `${this.baseUrl}/api/v1/chat/${this.config.botId}/feedback/${messageId}?feedback=${feedback}`,
      {
        method: 'POST',
        headers: {
          'X-API-Key': this.config.apiKey,
          'X-Session-Id': this.sessionId
        }
      }
    );
  }

  clearSession(): void {
    this.sessionId = null;
    localStorage.removeItem(`zaia_session_${this.config.botId}`);
  }
}
