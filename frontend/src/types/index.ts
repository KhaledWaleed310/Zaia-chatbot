export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  status: 'processing' | 'ready' | 'failed';
  document_count: number;
  created_at: string;
  updated_at: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
}

export interface Document {
  id: string;
  knowledge_base_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunk_count: number;
  uploaded_at: string;
  processed_at?: string;
  error_message?: string;
}

export interface Chatbot {
  id: string;
  name: string;
  description: string;
  knowledge_base_id: string;
  knowledge_base_name?: string;
  status: 'active' | 'inactive';
  model_name: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  top_k: number;
  created_at: string;
  updated_at: string;
  total_conversations: number;
  total_messages: number;
}

export interface Conversation {
  id: string;
  chatbot_id: string;
  session_id: string;
  started_at: string;
  last_message_at: string;
  message_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: RetrievedChunk[];
  created_at: string;
}

export interface RetrievedChunk {
  chunk_id: string;
  document_id: string;
  document_name: string;
  content: string;
  similarity_score: number;
  metadata: Record<string, any>;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  stream?: boolean;
}

export interface ChatResponse {
  response: string;
  sources: RetrievedChunk[];
  session_id: string;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

export interface DashboardStats {
  total_knowledge_bases: number;
  total_documents: number;
  total_chatbots: number;
  total_conversations: number;
  total_messages: number;
  active_chatbots: number;
}

export interface UsageStats {
  date: string;
  conversations: number;
  messages: number;
  unique_sessions: number;
}

export interface ApiError {
  message: string;
  detail?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';
