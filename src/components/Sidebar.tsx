// ============================================================
// Sidebar Component - Navigation & Conversations
// ============================================================

import { useChatStore } from '../store/chatStore';
import {
  MessageSquare,
  Upload,
  BarChart3,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Brain,
  Zap,
  Database,
} from 'lucide-react';

export default function Sidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    currentView,
    setCurrentView,
    conversations,
    currentConversationId,
    setCurrentConversation,
    createConversation,
    clearConversation,
    systemStatus,
  } = useChatStore();

  const handleNewChat = () => {
    createConversation();
    setCurrentView('chat');
  };

  const navItems = [
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
    { id: 'upload' as const, label: 'Upload', icon: Upload },
    { id: 'admin' as const, label: 'Admin', icon: BarChart3 },
  ];

  return (
    <aside
      className={`${
        sidebarOpen ? 'w-72' : 'w-16'
      } bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 ease-in-out relative`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute -right-3 top-6 z-10 w-6 h-6 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-3 h-3 text-gray-400" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-400" />
        )}
      </button>

      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="text-sm font-bold text-white">RAG Platform</h1>
              <p className="text-xs text-gray-500">Enterprise Edition</p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className={`${
            sidebarOpen ? 'w-full justify-start gap-2 px-3' : 'w-10 justify-center mx-auto'
          } h-10 flex items-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg transition-all text-sm font-medium`}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {sidebarOpen && 'New Chat'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`${
                sidebarOpen ? 'w-full justify-start gap-3 px-3' : 'w-10 justify-center mx-auto'
              } h-10 flex items-center rounded-lg transition-all text-sm ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && item.label}
            </button>
          );
        })}
      </nav>

      {/* Conversations List */}
      {sidebarOpen && currentView === 'chat' && (
        <div className="flex-1 overflow-y-auto mt-4 px-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-1">
            Conversations
          </p>
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                  currentConversationId === conv.id
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`}
                onClick={() => setCurrentConversation(conv.id)}
              >
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-sm truncate flex-1">{conv.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-gray-600 px-1 py-4 text-center">
                No conversations yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* System Status */}
      {sidebarOpen && (
        <div className="p-3 border-t border-gray-800">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-1">
            System Status
          </p>
          <div className="space-y-2">
            <StatusIndicator
              icon={<Zap className="w-3 h-3" />}
              label="Groq"
              status={systemStatus?.groqStatus || 'offline'}
            />
            <StatusIndicator
              icon={<Brain className="w-3 h-3" />}
              label="Gemini"
              status={systemStatus?.geminiStatus || 'offline'}
            />
            <StatusIndicator
              icon={<Database className="w-3 h-3" />}
              label="Qdrant"
              status={systemStatus?.qdrantStatus || 'offline'}
            />
          </div>
        </div>
      )}
    </aside>
  );
}

function StatusIndicator({
  icon,
  label,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
}) {
  const colorMap: Record<string, string> = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    rate_limited: 'bg-yellow-500',
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      {icon}
      <span>{label}</span>
      <div className={`w-2 h-2 rounded-full ${colorMap[status] || 'bg-gray-500'} ml-auto`} />
    </div>
  );
}
