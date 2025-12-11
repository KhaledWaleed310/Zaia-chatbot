export interface ZaiaConfig {
  botId: string;
  apiKey: string;
  baseUrl?: string;
  position?: 'bottom-right' | 'bottom-left';
  theme?: 'light' | 'dark' | 'auto';
  primaryColor?: string;
  welcomeMessage?: string;
  placeholderText?: string;
  showBranding?: boolean;
  containerSelector?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp: Date;
  feedback?: 'positive' | 'negative' | null;
}

export interface Source {
  text: string;
  kb_id: string;
  source_type: string;
  score: number;
}

export interface ChatResponse {
  session_id: string;
  message: {
    id: string;
    role: 'assistant';
    content: string;
    sources: Source[];
    timestamp: string;
  };
  sources: Source[];
}

export interface ZaiaInstance {
  init: (config: ZaiaConfig) => void;
  open: () => void;
  close: () => void;
  destroy: () => void;
  sendMessage: (message: string) => void;
}
