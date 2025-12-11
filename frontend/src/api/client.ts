import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';
import { ApiError } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { token } = useAuthStore.getState();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const { response } = error;

    if (!response) {
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        status: 0,
      });
    }

    // Handle 401 - Unauthorized
    if (response.status === 401) {
      const { logout } = useAuthStore.getState();
      logout();
      window.location.href = '/login';
      return Promise.reject({
        message: 'Session expired. Please login again.',
        status: 401,
      });
    }

    // Handle other errors
    const errorData: ApiError = {
      message: response.data?.message || 'An error occurred',
      detail: response.data?.detail,
      status: response.status,
    };

    return Promise.reject(errorData);
  }
);

export default apiClient;

// API endpoints
export const api = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string) =>
      apiClient.post('/v1/auth/login', { email, password }),
    register: (email: string, password: string, name: string) =>
      apiClient.post('/v1/auth/register', { email, password, name }),
    me: () => apiClient.get('/v1/auth/me'),
    logout: () => apiClient.post('/v1/auth/logout'),
  },

  // Knowledge base endpoints
  knowledgeBases: {
    list: (params?: { page?: number; page_size?: number }) =>
      apiClient.get('/v1/knowledge-bases/', { params }),
    get: (id: string) => apiClient.get(`/v1/knowledge-bases/${id}`),
    create: (data: {
      name: string;
      description?: string;
      embedding_model?: string;
      chunk_size?: number;
      chunk_overlap?: number;
    }) => apiClient.post('/v1/knowledge-bases/', data),
    update: (id: string, data: Partial<{ name: string; description: string }>) =>
      apiClient.put(`/v1/knowledge-bases/${id}`, data),
    delete: (id: string) => apiClient.delete(`/v1/knowledge-bases/${id}`),
  },

  // Document endpoints
  documents: {
    list: (knowledgeBaseId: string, params?: { page?: number; page_size?: number }) =>
      apiClient.get(`/v1/knowledge-bases/${knowledgeBaseId}/documents`, { params }),
    upload: (knowledgeBaseId: string, files: File[], onProgress?: (progress: number) => void) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      return apiClient.post(`/v1/knowledge-bases/${knowledgeBaseId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
    },
    delete: (knowledgeBaseId: string, documentId: string) =>
      apiClient.delete(`/v1/knowledge-bases/${knowledgeBaseId}/documents/${documentId}`),
  },

  // Chatbot endpoints
  chatbots: {
    list: (params?: { page?: number; page_size?: number }) =>
      apiClient.get('/v1/chatbots/', { params }),
    get: (id: string) => apiClient.get(`/v1/chatbots/${id}`),
    create: (data: {
      name: string;
      description?: string;
      knowledge_base_id: string;
      model_name?: string;
      temperature?: number;
      max_tokens?: number;
      system_prompt?: string;
      top_k?: number;
    }) => apiClient.post('/v1/chatbots/', data),
    update: (id: string, data: any) => apiClient.put(`/v1/chatbots/${id}`, data),
    delete: (id: string) => apiClient.delete(`/v1/chatbots/${id}`),
    updateStatus: (id: string, status: 'active' | 'inactive') =>
      apiClient.patch(`/v1/chatbots/${id}/status`, { status }),
  },

  // Chat endpoints
  chat: {
    send: (chatbotId: string, message: string, sessionId?: string) =>
      apiClient.post(`/v1/chatbots/${chatbotId}/chat`, {
        message,
        session_id: sessionId,
      }),
    history: (chatbotId: string, sessionId: string) =>
      apiClient.get(`/v1/chatbots/${chatbotId}/conversations/${sessionId}/messages`),
  },

  // Analytics endpoints
  analytics: {
    dashboard: () => apiClient.get('/v1/analytics/dashboard'),
    usage: (params?: { start_date?: string; end_date?: string; chatbot_id?: string }) =>
      apiClient.get('/v1/analytics/usage', { params }),
    conversations: (chatbotId: string, params?: { page?: number; page_size?: number }) =>
      apiClient.get(`/v1/chatbots/${chatbotId}/conversations`, { params }),
  },
};
