// ============================================================
// Mock Data for Development (when backend is not available)
// ============================================================

import type { EvaluationResult, SystemStatus, Message, AgentResponse } from '../types';

export const mockEvaluationResults: EvaluationResult[] = [
  {
    id: 'eval-1',
    timestamp: Date.now() - 86400000 * 2,
    metrics: [
      { name: 'Faithfulness', value: 0.92, threshold: 0.7, status: 'pass' },
      { name: 'Answer Relevance', value: 0.88, threshold: 0.7, status: 'pass' },
      { name: 'Context Precision', value: 0.85, threshold: 0.7, status: 'pass' },
    ],
    totalQuestions: 20,
    passedQuestions: 18,
    avgFaithfulness: 0.92,
    avgAnswerRelevance: 0.88,
    avgContextPrecision: 0.85,
    details: [
      {
        question: 'What is the main topic of the document?',
        expectedAnswer: 'The document covers enterprise RAG architecture.',
        generatedAnswer: 'The document discusses enterprise RAG (Retrieval Augmented Generation) architecture patterns.',
        faithfulness: 0.95,
        answerRelevance: 0.92,
        contextPrecision: 0.90,
      },
      {
        question: 'What technologies are used?',
        expectedAnswer: 'FastAPI, LangChain, LangGraph, Qdrant, Groq, Gemini.',
        generatedAnswer: 'The tech stack includes FastAPI for the backend, LangChain and LangGraph for orchestration, Qdrant for vector storage, and Groq/Gemini as LLM providers.',
        faithfulness: 0.93,
        answerRelevance: 0.91,
        contextPrecision: 0.88,
      },
    ],
  },
  {
    id: 'eval-2',
    timestamp: Date.now() - 86400000,
    metrics: [
      { name: 'Faithfulness', value: 0.89, threshold: 0.7, status: 'pass' },
      { name: 'Answer Relevance', value: 0.91, threshold: 0.7, status: 'pass' },
      { name: 'Context Precision', value: 0.72, threshold: 0.7, status: 'warning' },
    ],
    totalQuestions: 20,
    passedQuestions: 17,
    avgFaithfulness: 0.89,
    avgAnswerRelevance: 0.91,
    avgContextPrecision: 0.72,
    details: [],
  },
];

export const mockSystemStatus: SystemStatus = {
  groqStatus: 'online',
  geminiStatus: 'online',
  qdrantStatus: 'online',
  backendStatus: 'online',
  uptime: 864000,
  totalQueries: 1247,
  avgResponseTime: 1.2,
};

export const mockAgentResponse: AgentResponse = {
  answer: 'Based on the uploaded documents, the RAG architecture uses a multi-LLM routing system. Simple queries are handled by Groq (Llama3-8b) for fast responses, while complex queries requiring deep analysis are routed to Gemini-1.5-Flash for its larger context window. The vector store uses Qdrant for similarity search with cosine distance metrics.',
  sources: [
    {
      file_name: 'rag_architecture.pdf',
      page_number: 3,
      chunk_id: 'chunk-001',
      content: 'The RAG system implements a router-based architecture...',
      score: 0.94,
    },
    {
      file_name: 'tech_stack.md',
      page_number: 1,
      chunk_id: 'chunk-015',
      content: 'Groq is used for fast inference with Llama3 models...',
      score: 0.89,
    },
  ],
  confidence: 0.91,
  router_decision: {
    decision: 'search',
    reasoning: 'Query requires document search for accurate response.',
  },
};

export const mockMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'What is the RAG architecture used in this project?',
    timestamp: Date.now() - 60000,
  },
  {
    id: '2',
    role: 'assistant',
    content: mockAgentResponse.answer,
    timestamp: Date.now() - 55000,
    sources: mockAgentResponse.sources,
    confidence: mockAgentResponse.confidence,
    routerDecision: mockAgentResponse.router_decision,
  },
  {
    id: '3',
    role: 'user',
    content: 'How does the multi-LLM routing work?',
    timestamp: Date.now() - 30000,
  },
  {
    id: '4',
    role: 'assistant',
    content: 'The multi-LLM routing system uses a LangGraph state machine with three possible paths:\n\n1. **Direct** - For greetings and simple math, responds immediately without retrieval\n2. **Search** - For document-based queries, retrieves relevant chunks from Qdrant and generates with Groq (Llama3-70b)\n3. **Complex** - For multi-document analysis, uses Gemini-1.5-Flash for its larger context window\n\nThe router node uses Groq (Llama3-8b) to classify the query type, then conditionally routes to the appropriate generator node.',
    timestamp: Date.now() - 25000,
    sources: [
      {
        file_name: 'langgraph_design.pdf',
        page_number: 5,
        chunk_id: 'chunk-042',
        content: 'LangGraph StateGraph with conditional edges...',
        score: 0.92,
      },
    ],
    confidence: 0.94,
    routerDecision: {
      decision: 'search',
      reasoning: 'Query about system architecture requires document retrieval.',
    },
  },
];
