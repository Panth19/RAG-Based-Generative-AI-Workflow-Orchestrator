import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add conversation_id
api.interceptors.request.use((config) => {
  const conversationId = localStorage.getItem('conversationId');
  if (conversationId) {
    config.headers['X-Conversation-ID'] = conversationId;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 504) {
      throw new Error('Request took too long, please try a simpler query.');
    }
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
    }
    throw error;
  }
);

export interface ChatResponse {
  answer: string;
  sources: string[];
  confidence: number;
  router_decision: string;
}

export interface UploadResponse {
  file_url: string;
  file_id: string;
  message: string;
}

export interface EvalMetrics {
  faithfulness: number;
  answer_relevance: number;
  context_precision: number;
  overall_score: number;
  timestamp: string;
}

export interface EvalHistory {
  metrics: EvalMetrics[];
  latest: EvalMetrics | null;
}

// Chat API
export const chatAPI = {
  sendMessage: async (
    message: string,
    conversationId: string
  ): Promise<ChatResponse> => {
    const response = await api.post('/chat', {
      message,
      conversation_id: conversationId,
    });
    return response.data;
  },

  sendMessageStream: async function* (
    message: string,
    conversationId: string
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${API_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Conversation-ID': conversationId,
      },
      body: JSON.stringify({ message, conversation_id: conversationId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No reader available');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              yield parsed.token;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  },

  getHistory: async (conversationId: string) => {
    const response = await api.get(`/history/${conversationId}`);
    return response.data;
  },
};

// Upload API
export const uploadAPI = {
  uploadFile: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  checkProcessingStatus: async (fileId: string) => {
    const response = await api.get(`/upload/status/${fileId}`);
    return response.data;
  },
};

// Admin/Evaluation API
export const adminAPI = {
  getMetrics: async (): Promise<EvalHistory> => {
    const response = await api.get('/admin/metrics');
    return response.data;
  },

  runEvaluation: async () => {
    const response = await api.post('/admin/evaluate');
    return response.data;
  },

  getSystemStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },
};

export default api;
