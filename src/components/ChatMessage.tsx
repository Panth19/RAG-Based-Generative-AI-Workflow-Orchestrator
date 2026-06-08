// ============================================================
// Chat Message Component
// ============================================================

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  User,
  Bot,
  ChevronDown,
  ChevronUp,
  FileText,
  Zap,
  Brain,
  Search,
  Copy,
  Check,
  Shield,
} from 'lucide-react';
import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);

  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const routerIcon = message.routerDecision?.decision === 'search' ? (
    <Search className="w-3 h-3" />
  ) : message.routerDecision?.decision === 'complex' ? (
    <Brain className="w-3 h-3" />
  ) : (
    <Zap className="w-3 h-3" />
  );

  const routerLabel = message.routerDecision?.decision === 'search'
    ? 'Document Search'
    : message.routerDecision?.decision === 'complex'
    ? 'Complex Analysis (Gemini)'
    : 'Direct Response (Groq)';

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
              : 'bg-gray-800 text-gray-100 border border-gray-700'
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="text-sm space-y-1 my-2 list-disc list-inside">{children}</ul>,
                  ol: ({ children }) => <ol className="text-sm space-y-1 my-2 list-decimal list-inside">{children}</ol>,
                  li: ({ children }) => <li className="text-gray-300">{children}</li>,
                  code: ({ children }) => (
                    <code className="bg-gray-900 px-1.5 py-0.5 rounded text-xs text-purple-300">{children}</code>
                  ),
                  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-0.5" />
              )}
            </div>
          )}
        </div>

        {/* Message Actions & Metadata */}
        {!isUser && !isStreaming && (
          <div className="mt-2 space-y-2">
            {/* Router Decision & Confidence */}
            <div className="flex items-center gap-3 flex-wrap">
              {message.routerDecision && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-full">
                  {routerIcon}
                  <span>{routerLabel}</span>
                </div>
              )}
              {message.confidence !== undefined && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-full">
                  <Shield className="w-3 h-3" />
                  <span>Confidence: {(message.confidence * 100).toFixed(0)}%</span>
                </div>
              )}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div>
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>{message.sources.length} source{message.sources.length > 1 ? 's' : ''}</span>
                </button>

                {showSources && (
                  <div className="mt-2 space-y-2">
                    {message.sources.map((source, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-3 h-3 text-purple-400" />
                          <span className="text-purple-400 font-medium">{source.file_name}</span>
                          <span className="text-gray-600">•</span>
                          <span className="text-gray-500">Page {source.page_number}</span>
                          <span className="text-gray-600">•</span>
                          <span className="text-gray-500">Score: {(source.score * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-gray-400 leading-relaxed">{source.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-4 h-4 text-gray-300" />
        </div>
      )}
    </div>
  );
}
