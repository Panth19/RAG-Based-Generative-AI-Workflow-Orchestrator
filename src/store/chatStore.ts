// ============================================================
// Zustand Store - Chat & Application State
// ============================================================

import { create } from 'zustand';
import type { Message, Conversation, UploadedFile, EvaluationResult, SystemStatus } from '../types';

interface ChatState {
  // Conversations
  conversations: Conversation[];
  currentConversationId: string | null;
  isStreaming: boolean;
  streamingContent: string;

  // Files
  uploadedFiles: UploadedFile[];

  // Evaluation
  evaluationResults: EvaluationResult[];

  // System
  systemStatus: SystemStatus | null;
  sidebarOpen: boolean;
  currentView: 'chat' | 'upload' | 'admin';

  // Actions
  createConversation: () => string;
  setCurrentConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateLastAssistantMessage: (conversationId: string, content: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  addUploadedFile: (file: UploadedFile) => void;
  updateFileStatus: (fileId: string, status: UploadedFile['status'], progress?: number) => void;
  setEvaluationResults: (results: EvaluationResult[]) => void;
  setSystemStatus: (status: SystemStatus) => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentView: (view: 'chat' | 'upload' | 'admin') => void;
  getCurrentConversation: () => Conversation | null;
  clearConversation: (id: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  isStreaming: false,
  streamingContent: '',
  uploadedFiles: [],
  evaluationResults: [],
  systemStatus: null,
  sidebarOpen: true,
  currentView: 'chat',

  createConversation: () => {
    const id = crypto.randomUUID();
    const newConversation: Conversation = {
      id,
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({
      conversations: [newConversation, ...state.conversations],
      currentConversationId: id,
    }));
    return id;
  },

  setCurrentConversation: (id: string) => {
    set({ currentConversationId: id });
  },

  addMessage: (conversationId: string, message: Message) => {
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id === conversationId) {
          const updatedMessages = [...conv.messages, message];
          const title = conv.messages.length === 0 && message.role === 'user'
            ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
            : conv.title;
          return {
            ...conv,
            messages: updatedMessages,
            title,
            updatedAt: Date.now(),
          };
        }
        return conv;
      }),
    }));
  },

  updateLastAssistantMessage: (conversationId: string, content: string) => {
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id === conversationId) {
          const messages = [...conv.messages];
          const lastIdx = messages.length - 1;
          if (lastIdx >= 0 && messages[lastIdx].role === 'assistant') {
            messages[lastIdx] = { ...messages[lastIdx], content };
          }
          return { ...conv, messages, updatedAt: Date.now() };
        }
        return conv;
      }),
    }));
  },

  setIsStreaming: (streaming: boolean) => set({ isStreaming: streaming }),
  setStreamingContent: (content: string) => set({ streamingContent: content }),

  addUploadedFile: (file: UploadedFile) => {
    set((state) => ({
      uploadedFiles: [file, ...state.uploadedFiles],
    }));
  },

  updateFileStatus: (fileId: string, status: UploadedFile['status'], progress?: number) => {
    set((state) => ({
      uploadedFiles: state.uploadedFiles.map((f) =>
        f.id === fileId ? { ...f, status, ...(progress !== undefined ? { progress } : {}) } : f
      ),
    }));
  },

  setEvaluationResults: (results: EvaluationResult[]) => set({ evaluationResults: results }),
  setSystemStatus: (status: SystemStatus) => set({ systemStatus: status }),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  setCurrentView: (view: 'chat' | 'upload' | 'admin') => set({ currentView: view }),

  getCurrentConversation: () => {
    const state = get();
    return state.conversations.find((c) => c.id === state.currentConversationId) || null;
  },

  clearConversation: (id: string) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === id ? { ...conv, messages: [], updatedAt: Date.now() } : conv
      ),
    }));
  },
}));
