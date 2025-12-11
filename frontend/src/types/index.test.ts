import { describe, it, expect } from 'vitest';
import type {
  User,
  AuthState,
  KnowledgeBase,
  Chatbot,
  Message,
  ChatRequest,
  ChatResponse,
  DashboardStats,
  ApiError,
} from './index';

describe('Type Definitions', () => {
  describe('User type', () => {
    it('should have correct structure', () => {
      const user: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.created_at).toBeDefined();
    });
  });

  describe('AuthState type', () => {
    it('should have correct structure when authenticated', () => {
      const authState: AuthState = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          created_at: '2024-01-01T00:00:00Z',
        },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
      };

      expect(authState.user).toBeDefined();
      expect(authState.token).toBe('test-token');
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.isLoading).toBe(false);
    });

    it('should have correct structure when not authenticated', () => {
      const authState: AuthState = {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };

      expect(authState.user).toBeNull();
      expect(authState.token).toBeNull();
      expect(authState.isAuthenticated).toBe(false);
    });
  });

  describe('KnowledgeBase type', () => {
    it('should have correct structure', () => {
      const kb: KnowledgeBase = {
        id: 'kb-1',
        name: 'Test KB',
        description: 'Test description',
        status: 'ready',
        document_count: 10,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        embedding_model: 'all-MiniLM-L6-v2',
        chunk_size: 500,
        chunk_overlap: 50,
      };

      expect(kb.id).toBeDefined();
      expect(kb.status).toBe('ready');
      expect(['processing', 'ready', 'failed']).toContain(kb.status);
    });

    it('should accept all valid status values', () => {
      const statuses: KnowledgeBase['status'][] = ['processing', 'ready', 'failed'];
      statuses.forEach((status) => {
        const kb: KnowledgeBase = {
          id: 'kb-1',
          name: 'Test KB',
          description: 'Test description',
          status,
          document_count: 10,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          embedding_model: 'all-MiniLM-L6-v2',
          chunk_size: 500,
          chunk_overlap: 50,
        };
        expect(kb.status).toBe(status);
      });
    });
  });

  describe('Chatbot type', () => {
    it('should have correct structure', () => {
      const chatbot: Chatbot = {
        id: 'bot-1',
        name: 'Test Bot',
        description: 'A test chatbot',
        knowledge_base_id: 'kb-1',
        status: 'active',
        model_name: 'gpt-4',
        temperature: 0.7,
        max_tokens: 1000,
        system_prompt: 'You are a helpful assistant.',
        top_k: 5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        total_conversations: 100,
        total_messages: 500,
      };

      expect(chatbot.id).toBeDefined();
      expect(chatbot.status).toBe('active');
      expect(chatbot.temperature).toBeGreaterThanOrEqual(0);
      expect(chatbot.temperature).toBeLessThanOrEqual(1);
    });
  });

  describe('Message type', () => {
    it('should accept user role', () => {
      const message: Message = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'user',
        content: 'Hello, how are you?',
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(message.role).toBe('user');
    });

    it('should accept assistant role', () => {
      const message: Message = {
        id: 'msg-2',
        conversation_id: 'conv-1',
        role: 'assistant',
        content: 'I am doing well, thank you!',
        sources: [],
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(message.role).toBe('assistant');
    });
  });

  describe('ChatRequest type', () => {
    it('should have required message field', () => {
      const request: ChatRequest = {
        message: 'What is the weather today?',
      };

      expect(request.message).toBeDefined();
      expect(request.session_id).toBeUndefined();
      expect(request.stream).toBeUndefined();
    });

    it('should accept optional fields', () => {
      const request: ChatRequest = {
        message: 'What is the weather today?',
        session_id: 'session-123',
        stream: true,
      };

      expect(request.message).toBeDefined();
      expect(request.session_id).toBe('session-123');
      expect(request.stream).toBe(true);
    });
  });

  describe('DashboardStats type', () => {
    it('should have all numeric fields', () => {
      const stats: DashboardStats = {
        total_knowledge_bases: 5,
        total_documents: 100,
        total_chatbots: 3,
        total_conversations: 1000,
        total_messages: 5000,
        active_chatbots: 2,
      };

      expect(typeof stats.total_knowledge_bases).toBe('number');
      expect(typeof stats.total_documents).toBe('number');
      expect(typeof stats.total_chatbots).toBe('number');
      expect(typeof stats.total_conversations).toBe('number');
      expect(typeof stats.total_messages).toBe('number');
      expect(typeof stats.active_chatbots).toBe('number');
    });
  });

  describe('ApiError type', () => {
    it('should have message field', () => {
      const error: ApiError = {
        message: 'Something went wrong',
      };

      expect(error.message).toBeDefined();
    });

    it('should accept optional fields', () => {
      const error: ApiError = {
        message: 'Something went wrong',
        detail: 'More details about the error',
        status: 400,
      };

      expect(error.message).toBeDefined();
      expect(error.detail).toBe('More details about the error');
      expect(error.status).toBe(400);
    });
  });
});
