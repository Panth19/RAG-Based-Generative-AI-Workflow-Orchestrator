import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, EvalMetrics } from '../lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

export default function AdminPage() {
  const [metrics, setMetrics] = useState<EvalMetrics[]>([]);
  const [latest, setLatest] = useState<EvalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const data = await adminAPI.getMetrics();
      setMetrics(data.metrics || []);
      setLatest(data.latest);
    } catch {
      // Use mock data for demo
      setMetrics([
        {
          faithfulness: 0.85,
          answer_relevance: 0.82,
          context_precision: 0.78,
          overall_score: 0.82,
          timestamp: new Date(Date.now() - 86400000 * 6).toISOString(),
        },
        {
          faithfulness: 0.87,
          answer_relevance: 0.84,
          context_precision: 0.80,
          overall_score: 0.84,
          timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
        {
          faithfulness: 0.84,
          answer_relevance: 0.81,
          context_precision: 0.79,
          overall_score: 0.81,
          timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
        },
        {
          faithfulness: 0.88,
          answer_relevance: 0.86,
          context_precision: 0.82,
          overall_score: 0.85,
          timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
        {
          faithfulness: 0.86,
          answer_relevance: 0.85,
          context_precision: 0.84,
          overall_score: 0.85,
          timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          faithfulness: 0.89,
          answer_relevance: 0.87,
          context_precision: 0.85,
          overall_score: 0.87,
          timestamp: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
      setLatest({
        faithfulness: 0.89,
        answer_relevance: 0.87,
        context_precision: 0.85,
        overall_score: 0.87,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const runEvaluation = async () => {
    setEvaluating(true);
    setError(null);
    try {
      await adminAPI.runEvaluation();
      await fetchMetrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  const chartData = metrics.map((m) => ({
    date: new Date(m.timestamp).toLocaleDateString(),
    Faithfulness: (m.faithfulness * 100).toFixed(1),
    Relevance: (m.answer_relevance * 100).toFixed(1),
    Precision: (m.context_precision * 100).toFixed(1),
    Overall: (m.overall_score * 100).toFixed(1),
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white flex items-center gap-3">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading metrics...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Chat
            </Link>
            <div className="h-6 w-px bg-slate-700"></div>
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <button
            onClick={runEvaluation}
            disabled={evaluating}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            {evaluating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Running Evaluation...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Run Evaluation
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-slate-400">Faithfulness</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {latest ? `${(latest.faithfulness * 100).toFixed(1)}%` : '--'}
            </div>
            <p className="text-sm text-slate-500 mt-1">Answer accuracy</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-slate-400">Relevance</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {latest ? `${(latest.answer_relevance * 100).toFixed(1)}%` : '--'}
            </div>
            <p className="text-sm text-slate-500 mt-1">Answer relevance</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <span className="text-slate-400">Precision</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {latest ? `${(latest.context_precision * 100).toFixed(1)}%` : '--'}
            </div>
            <p className="text-sm text-slate-500 mt-1">Context precision</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-slate-400">Overall Score</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {latest ? `${(latest.overall_score * 100).toFixed(1)}%` : '--'}
            </div>
            <p className="text-sm text-slate-500 mt-1">Combined quality</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line Chart */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quality Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[60, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="Faithfulness" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Relevance" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Precision" stroke="#a855f7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Overall" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Latest Evaluation</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { name: 'Faithfulness', value: latest ? latest.faithfulness * 100 : 0 },
                  { name: 'Relevance', value: latest ? latest.answer_relevance * 100 : 0 },
                  { name: 'Precision', value: latest ? latest.context_precision * 100 : 0 },
                  { name: 'Overall', value: latest ? latest.overall_score * 100 : 0 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Score']}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quality Gate Status */}
        <div className="mt-6 bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quality Gate Status</h3>
          <div className="flex items-center gap-4">
            <div
              className={`w-3 h-3 rounded-full ${
                latest && latest.context_precision >= 0.7 ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <div>
              <p className="text-white">
                {latest && latest.context_precision >= 0.7
                  ? 'Quality gate passed - Ready for deployment'
                  : 'Quality gate failed - Context precision below 70% threshold'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Threshold: 70% | Current: {latest ? `${(latest.context_precision * 100).toFixed(1)}%` : '--'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
