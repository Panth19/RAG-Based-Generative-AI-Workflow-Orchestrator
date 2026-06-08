// ============================================================
// RAG Enterprise Platform - Type Definitions
// ============================================================

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sources?: SourceDocument[];
  confidence?: number;
  routerDecision?: RouterDecision;
}

export interface SourceDocument {
  file_name: string;
  page_number: number;
  chunk_id: string;
  content: string;
  score: number;
}

export interface RouterDecision {
  decision: 'search' | 'direct' | 'complex';
  reasoning: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  s3Url?: string;
  error?: string;
  uploadedAt: number;
  chunksProcessed?: number;
}

export interface EvaluationMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'pass' | 'fail' | 'warning';
}

export interface EvaluationResult {
  id: string;
  timestamp: number;
  metrics: EvaluationMetric[];
  totalQuestions: number;
  passedQuestions: number;
  avgFaithfulness: number;
  avgAnswerRelevance: number;
  avgContextPrecision: number;
  details: EvaluationDetail[];
}

export interface EvaluationDetail {
  question: string;
  expectedAnswer: string;
  generatedAnswer: string;
  faithfulness: number;
  answerRelevance: number;
  contextPrecision: number;
}

export interface ChatHistoryEntry {
  conversation_id: string;
  timestamp: number;
  role: string;
  content: string;
}

export interface AgentResponse {
  answer: string;
  sources: SourceDocument[];
  confidence: number;
  router_decision: RouterDecision;
}

export interface SystemStatus {
  groqStatus: 'online' | 'offline' | 'rate_limited';
  geminiStatus: 'online' | 'offline' | 'rate_limited';
  qdrantStatus: 'online' | 'offline';
  backendStatus: 'online' | 'offline';
  uptime: number;
  totalQueries: number;
  avgResponseTime: number;
}
