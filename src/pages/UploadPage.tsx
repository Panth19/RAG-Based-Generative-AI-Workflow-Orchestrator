// ============================================================
// Upload Page - Document Management
// ============================================================

import FileUpload from '../components/FileUpload';
import { useChatStore } from '../store/chatStore';
import {
  Upload,
  FileText,
  Database,
  Cpu,
  ArrowRight,
  CheckCircle2,
  HardDrive,
  Clock,
} from 'lucide-react';

export default function UploadPage() {
  const { uploadedFiles } = useChatStore();

  const stats = {
    total: uploadedFiles.length,
    completed: uploadedFiles.filter((f) => f.status === 'completed').length,
    processing: uploadedFiles.filter((f) => f.status === 'processing' || f.status === 'uploading').length,
    totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pipelineSteps = [
    {
      icon: <Upload className="w-5 h-5" />,
      title: 'Upload',
      description: 'Files are uploaded and stored locally or in object storage',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: 'Parse & Chunk',
      description: 'Documents are parsed and split into 500-char chunks with 50-char overlap',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      icon: <Cpu className="w-5 h-5" />,
      title: 'Embed',
      description: 'Google Generative AI creates embeddings using embedding-001 model',
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      icon: <Database className="w-5 h-5" />,
      title: 'Store',
      description: 'Vectors are upserted into Qdrant with source metadata',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Upload className="w-6 h-6 text-purple-400" />
          Document Upload
        </h1>
        <p className="text-gray-400 mt-1">
          Upload documents to build your knowledge base. Supported formats: PDF, TXT, MD, DOC, DOCX
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Files</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.completed}</p>
              <p className="text-xs text-gray-500">Processed</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.processing}</p>
              <p className="text-xs text-gray-500">Processing</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatSize(stats.totalSize)}</p>
              <p className="text-xs text-gray-500">Total Size</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Component */}
      <FileUpload />

      {/* Processing Pipeline */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Ingestion Pipeline</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {pipelineSteps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 min-w-[200px]">
                <div className={`w-10 h-10 ${step.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <div className={step.color}>{step.icon}</div>
                </div>
                <h3 className="text-sm font-medium text-white">{step.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{step.description}</p>
              </div>
              {idx < pipelineSteps.length - 1 && (
                <ArrowRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Configuration Info */}
      <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Chunk Size</span>
              <span className="text-gray-300">500 characters</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Chunk Overlap</span>
              <span className="text-gray-300">50 characters</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Splitter</span>
              <span className="text-gray-300">RecursiveCharacterTextSplitter</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Embedding Model</span>
              <span className="text-gray-300">embedding-001</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Vector DB</span>
              <span className="text-gray-300">Qdrant (Cosine)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Max File Size</span>
              <span className="text-gray-300">10 MB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
