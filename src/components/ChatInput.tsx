// ============================================================
// Chat Input Component with Send Button
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export default function ChatInput({ onSend, isStreaming, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || isStreaming || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-3 bg-gray-800 rounded-2xl border border-gray-700 focus-within:border-purple-500/50 transition-colors">
          <button
            className="p-3 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your documents..."
            disabled={isStreaming || disabled}
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 py-3 resize-none outline-none max-h-40"
            rows={1}
          />

          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming || disabled}
            className={`p-3 rounded-xl mr-1 mb-1 transition-all flex-shrink-0 ${
              input.trim() && !isStreaming && !disabled
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        <p className="text-xs text-gray-600 text-center mt-2">
          RAG Enterprise Platform • Groq + Gemini + Qdrant • LangGraph Agent
        </p>
      </div>
    </div>
  );
}
