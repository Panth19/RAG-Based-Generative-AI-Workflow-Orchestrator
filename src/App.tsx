// ============================================================
// RAG Enterprise Platform - Main Application
// ============================================================

import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatPage from './pages/ChatPage';
import UploadPage from './pages/UploadPage';
import AdminPage from './pages/AdminPage';
import { useChatStore } from './store/chatStore';
import { mockSystemStatus } from './utils/mockData';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { currentView, setSystemStatus } = useChatStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize system status
    setSystemStatus(mockSystemStatus);

    // Simulate initialization
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [setSystemStatus]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">RAG Enterprise Platform</h1>
          <p className="text-sm text-gray-500">Initializing agents and vector store...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentView) {
      case 'chat':
        return <ChatPage />;
      case 'upload':
        return <UploadPage />;
      case 'admin':
        return <AdminPage />;
      default:
        return <ChatPage />;
    }
  };

  return (
    <div className="h-screen flex bg-gray-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {renderPage()}
      </main>
    </div>
  );
}
