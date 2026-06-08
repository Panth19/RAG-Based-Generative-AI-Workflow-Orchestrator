// ============================================================
// Evaluation Chart Component using Recharts
// ============================================================

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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import type { EvaluationResult } from '../types';

interface EvaluationChartProps {
  results: EvaluationResult[];
}

export function MetricTrendChart({ results }: EvaluationChartProps) {
  const data = results
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((r) => ({
      date: new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Faithfulness: r.avgFaithfulness,
      'Answer Relevance': r.avgAnswerRelevance,
      'Context Precision': r.avgContextPrecision,
    }));

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <h3 className="text-sm font-medium text-gray-300 mb-4">Metric Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
          <YAxis domain={[0, 1]} stroke="#6B7280" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="Faithfulness" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="Answer Relevance" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="Context Precision" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MetricBarChart({ results }: EvaluationChartProps) {
  const latest = results[results.length - 1];
  if (!latest) return null;

  const data = latest.metrics.map((m) => ({
    name: m.name,
    value: m.value,
    threshold: m.threshold,
  }));

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <h3 className="text-sm font-medium text-gray-300 mb-4">Latest Evaluation Scores</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
          <YAxis domain={[0, 1]} stroke="#6B7280" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend />
          <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Score" />
          <Bar dataKey="threshold" fill="#374151" radius={[4, 4, 0, 0]} name="Threshold" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MetricRadarChart({ results }: EvaluationChartProps) {
  const latest = results[results.length - 1];
  if (!latest) return null;

  const data = latest.metrics.map((m) => ({
    metric: m.name,
    score: m.value,
    threshold: m.threshold,
  }));

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <h3 className="text-sm font-medium text-gray-300 mb-4">Performance Radar</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis dataKey="metric" stroke="#9CA3AF" fontSize={12} />
          <PolarRadiusAxis angle={30} domain={[0, 1]} stroke="#374151" />
          <Radar name="Score" dataKey="score" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
          <Radar name="Threshold" dataKey="threshold" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PassRateChart({ results }: EvaluationChartProps) {
  const data = results
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((r) => ({
      date: new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      'Pass Rate': Math.round((r.passedQuestions / r.totalQuestions) * 100),
      Passed: r.passedQuestions,
      Failed: r.totalQuestions - r.passedQuestions,
    }));

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <h3 className="text-sm font-medium text-gray-300 mb-4">Quality Gate Pass Rate</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
          <YAxis stroke="#6B7280" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend />
          <Bar dataKey="Passed" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Failed" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
