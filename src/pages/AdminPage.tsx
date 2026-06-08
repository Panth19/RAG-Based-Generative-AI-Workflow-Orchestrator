// ============================================================
// Admin Page - Evaluation Dashboard & System Status
// ============================================================

import { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { mockEvaluationResults, mockSystemStatus } from '../utils/mockData';
import {
  MetricTrendChart,
  MetricBarChart,
  MetricRadarChart,
  PassRateChart,
} from '../components/EvaluationChart';
import {
  BarChart3,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Zap,
  Brain,
  Database,
  Server,
  Clock,
  TrendingUp,
  FileText,
  RefreshCw,
  Lock,
} from 'lucide-react';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'system'>('overview');
  const { evaluationResults } = useChatStore();

  const results = evaluationResults.length > 0 ? evaluationResults : mockEvaluationResults;
  const systemStatus = mockSystemStatus;
  const latestResult = results[results.length - 1];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin' || password === 'demo') {
      setIsAuthenticated(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Admin Access</h2>
              <p className="text-sm text-gray-400 mt-1">
                Enter password to view evaluation dashboard
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:from-purple-500 hover:to-blue-500 transition-all"
              >
                Access Dashboard
              </button>
              <p className="text-xs text-gray-600 text-center">
                Demo password: admin or demo
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'details' as const, label: 'Details', icon: FileText },
    { id: 'system' as const, label: 'System', icon: Server },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            Evaluation Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            RAGAS quality metrics and system monitoring
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800/50 p-1 rounded-xl border border-gray-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && latestResult && (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              icon={<Shield className="w-5 h-5" />}
              label="Faithfulness"
              value={latestResult.avgFaithfulness}
              threshold={0.7}
              color="purple"
            />
            <MetricCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Answer Relevance"
              value={latestResult.avgAnswerRelevance}
              threshold={0.7}
              color="blue"
            />
            <MetricCard
              icon={<Activity className="w-5 h-5" />}
              label="Context Precision"
              value={latestResult.avgContextPrecision}
              threshold={0.7}
              color="green"
            />
          </div>

          {/* Quality Gate Status */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-300">Quality Gate</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Last run: {new Date(latestResult.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {latestResult.metrics.map((metric) => (
                <div
                  key={metric.name}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    metric.status === 'pass'
                      ? 'bg-green-500/10 border border-green-500/20'
                      : metric.status === 'warning'
                      ? 'bg-yellow-500/10 border border-yellow-500/20'
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}
                >
                  {metric.status === 'pass' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : metric.status === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{metric.name}</p>
                    <p className="text-xs text-gray-400">
                      {(metric.value * 100).toFixed(0)}% / {(metric.threshold * 100).toFixed(0)}% threshold
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-sm text-white font-medium">
                  {latestResult.passedQuestions}/{latestResult.totalQuestions} questions passed
                </span>
              </div>
              <div className="text-xs text-gray-500">
                ({((latestResult.passedQuestions / latestResult.totalQuestions) * 100).toFixed(0)}% pass rate)
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricTrendChart results={results} />
            <MetricBarChart results={results} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricRadarChart results={results} />
            <PassRateChart results={results} />
          </div>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 'details' && latestResult && (
        <div className="space-y-4">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-sm font-medium text-gray-300">Evaluation Details</h3>
              <p className="text-xs text-gray-500 mt-1">
                Individual question results from the golden dataset
              </p>
            </div>

            <div className="divide-y divide-gray-700/50">
              {latestResult.details.length > 0 ? (
                latestResult.details.map((detail, idx) => (
                  <div key={idx} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-gray-600 font-mono bg-gray-900 px-2 py-0.5 rounded">
                        Q{idx + 1}
                      </span>
                      <p className="text-sm text-gray-200 flex-1">{detail.question}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-8">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Expected</p>
                        <p className="text-xs text-gray-400 bg-gray-900/50 rounded p-2">
                          {detail.expectedAnswer}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Generated</p>
                        <p className="text-xs text-gray-400 bg-gray-900/50 rounded p-2">
                          {detail.generatedAnswer}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 ml-8">
                      <ScoreBadge label="Faithfulness" value={detail.faithfulness} />
                      <ScoreBadge label="Relevance" value={detail.answerRelevance} />
                      <ScoreBadge label="Precision" value={detail.contextPrecision} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No detailed results available for this evaluation run.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Service Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ServiceCard
              icon={<Zap className="w-5 h-5" />}
              name="Groq (Llama3)"
              status={systemStatus.groqStatus}
              description="Fast inference for routing and simple queries"
              endpoint="api.groq.com"
            />
            <ServiceCard
              icon={<Brain className="w-5 h-5" />}
              name="Google Gemini"
              status={systemStatus.geminiStatus}
              description="Complex reasoning with large context window"
              endpoint="generativelanguage.googleapis.com"
            />
            <ServiceCard
              icon={<Database className="w-5 h-5" />}
              name="Qdrant"
              status={systemStatus.qdrantStatus}
              description="Vector database for similarity search"
              endpoint="localhost:6333"
            />
            <ServiceCard
              icon={<Server className="w-5 h-5" />}
              name="Backend (FastAPI)"
              status={systemStatus.backendStatus}
              description="API server with LangGraph agent"
              endpoint="localhost:8000"
            />
          </div>

          {/* System Metrics */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-300 mb-4">System Metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-500">Uptime</p>
                <p className="text-2xl font-bold text-white">
                  {Math.floor(systemStatus.uptime / 86400)}d{' '}
                  {Math.floor((systemStatus.uptime % 86400) / 3600)}h
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Queries</p>
                <p className="text-2xl font-bold text-white">
                  {systemStatus.totalQueries.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Response Time</p>
                <p className="text-2xl font-bold text-white">
                  {systemStatus.avgResponseTime}s
                </p>
              </div>
            </div>
          </div>

          {/* Architecture Info */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Architecture</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <InfoRow label="Frontend" value="React + Vite + Tailwind CSS" />
                <InfoRow label="Backend" value="FastAPI + LangChain + LangGraph" />
                <InfoRow label="Vector DB" value="Qdrant (Cosine similarity)" />
                <InfoRow label="Embeddings" value="Google embedding-001" />
              </div>
              <div className="space-y-2">
                <InfoRow label="Router LLM" value="Groq Llama3-8b" />
                <InfoRow label="Simple LLM" value="Groq Llama3-70b" />
                <InfoRow label="Complex LLM" value="Gemini-1.5-Flash" />
                <InfoRow label="Evaluation" value="RAGAS Framework" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  threshold,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  threshold: number;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  };

  const c = colorMap[color] || colorMap.purple;
  const passed = value >= threshold;

  return (
    <div className={`bg-gray-800/50 border ${c.border} rounded-xl p-5`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${c.bg} rounded-lg flex items-center justify-center`}>
          <div className={c.text}>{icon}</div>
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-white">{(value * 100).toFixed(1)}%</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {passed ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-red-400" />
        )}
        <span className="text-xs text-gray-500">
          Threshold: {(threshold * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function ServiceCard({
  icon,
  name,
  status,
  description,
  endpoint,
}: {
  icon: React.ReactNode;
  name: string;
  status: string;
  description: string;
  endpoint: string;
}) {
  const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    online: { bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-500' },
    offline: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-500' },
    rate_limited: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  };

  const s = statusColors[status] || statusColors.offline;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
          <div className={s.text}>{icon}</div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-white">{name}</h4>
            <div className={`w-2 h-2 rounded-full ${s.dot}`} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          <p className="text-xs text-gray-600 mt-2 font-mono">{endpoint}</p>
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ label, value }: { label: string; value: number }) {
  const color =
    value >= 0.8 ? 'text-green-400 bg-green-500/10' :
    value >= 0.6 ? 'text-yellow-400 bg-yellow-500/10' :
    'text-red-400 bg-red-500/10';

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${color}`}>
      <span className="text-xs">{label}:</span>
      <span className="text-xs font-medium">{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300">{value}</span>
    </div>
  );
}
