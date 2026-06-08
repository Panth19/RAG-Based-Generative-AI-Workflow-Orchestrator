// ============================================================
// API Client - RAG Enterprise Platform
// ============================================================

import type { AgentResponse, UploadedFile, EvaluationResult, SystemStatus } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;
  private conversationId: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setConversationId(id: string) {
    this.conversationId = id;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.conversationId) {
      headers['X-Conversation-ID'] = this.conversationId;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 504) {
      throw new Error('Request took too long, please try a simpler query.');
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }
    return response.json();
  }

  // Chat with streaming support
  async chatStream(
    query: string,
    onToken: (token: string) => void,
    onComplete: (response: AgentResponse) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          query,
          conversation_id: this.conversationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        onError(errorData.detail || `HTTP ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError('No response stream available');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResponse: AgentResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              if (finalResponse) {
                onComplete(finalResponse);
              }
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'token') {
                onToken(parsed.content);
              } else if (parsed.type === 'response') {
                finalResponse = parsed.content as AgentResponse;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      if (finalResponse) {
        onComplete(finalResponse);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Network error');
    }
  }

  // Non-streaming chat
  async chat(query: string): Promise<AgentResponse> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query,
        conversation_id: this.conversationId,
      }),
    });
    return this.handleResponse<AgentResponse>(response);
  }

  // File upload
  async uploadFile(file: File, onProgress: (progress: number) => void): Promise<UploadedFile> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const fileId = crypto.randomUUID();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);
          resolve({
            id: fileId,
            name: file.name,
            size: file.size,
            status: 'processing',
            progress: 100,
            s3Url: result.s3_url,
            uploadedAt: Date.now(),
          });
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));

      const formData = new FormData();
      formData.append('file', file);

      xhr.open('POST', `${this.baseUrl}/upload`);
      xhr.send(formData);
    });
  }

  // Check processing status
  async checkProcessingStatus(fileId: string): Promise<{ status: string; chunksProcessed?: number }> {
    const response = await fetch(`${this.baseUrl}/upload/status/${fileId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Get conversation history
  async getConversationHistory(conversationId: string): Promise<AgentResponse[]> {
    const response = await fetch(`${this.baseUrl}/history/${conversationId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Get evaluation results
  async getEvaluationResults(): Promise<EvaluationResult[]> {
    const response = await fetch(`${this.baseUrl}/admin/evaluation`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Get system status
  async getSystemStatus(): Promise<SystemStatus> {
    const response = await fetch(`${this.baseUrl}/admin/status`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
