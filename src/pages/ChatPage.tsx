// ============================================================
// Chat Page - Main Conversation Interface
// ============================================================

import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import { mockAgentResponse } from '../utils/mockData';
import { MessageSquare, Sparkles, FileSearch, Zap, Brain, ArrowRight } from 'lucide-react';

export default function ChatPage() {
  const {
    conversations,
    currentConversationId,
    isStreaming,
    streamingContent,
    createConversation,
    addMessage,
    setIsStreaming,
    setStreamingContent,
    updateLastAssistantMessage,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentConversation = conversations.find((c) => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async (content: string) => {
    let convId = currentConversationId;
    if (!convId) {
      convId = createConversation();
    }

    // Add user message
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content,
      timestamp: Date.now(),
    };
    addMessage(convId, userMessage);

    // Start streaming
    setIsStreaming(true);
    setStreamingContent('');

    // Add empty assistant message
    const assistantMessage = {
      id: crypto.randomUUID(),
      role: 'assistant' as const,
      content: '',
      timestamp: Date.now(),
    };
    addMessage(convId, assistantMessage);

    // Simulate streaming response (in production, this uses SSE from the backend)
    const fullResponse = mockAgentResponse.answer;
    const words = fullResponse.split(' ');

    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 30));
      const partial = words.slice(0, i + 1).join(' ');
      setStreamingContent(partial);
      updateLastAssistantMessage(convId, partial);
    }

    // Finalize with metadata
    updateLastAssistantMessage(convId, fullResponse);
    setIsStreaming(false);
    setStreamingContent('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const suggestions = [
    {
      icon: <FileSearch className="w-4 h-4" />,
      text: 'What are the main topics in my documents?',
      color: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    },
    {
      icon: <Zap className="w-4 h-4" />,
      text: 'Summarize the key findings',
      color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    },
    {
      icon: <Brain className="w-4 h-4" />,
      text: 'Compare different approaches mentioned',
      color: 'from-green-500/20 to-green-600/20 border-green-500/30',
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      text: 'What are the conclusions?',
      color: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="max-w-2xl text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">RAG Enterprise Platform</h2>
              <p className="text-gray-400 mb-8">
                Ask questions about your uploaded documents. The AI agent will route your query
                through Groq for fast responses or Gemini for complex analysis.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(s.text)}
                    className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br ${s.color} border text-left text-sm text-gray-300 hover:text-white transition-all hover:scale-[1.02] group`}
                  >
                    <div className="text-gray-400 group-hover:text-white transition-colors">
                      {s.icon}
                    </div>
                    <span className="flex-1">{s.text}</span>
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </button>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" />
                  <span>Groq (Fast)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-blue-500" />
                  <span>Gemini (Smart)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileSearch className="w-3.5 h-3.5 text-green-500" />
                  <span>Qdrant (Search)</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isStreaming={
                  isStreaming &&
                  msg.role === 'assistant' &&
                  msg.id === messages[messages.length - 1]?.id
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput onSend={handleSend} isStreaming={isStreaming} />
    </div>
  );
}
