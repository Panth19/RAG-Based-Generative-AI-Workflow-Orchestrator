// ============================================================
// File Upload Component with Drag & Drop
// ============================================================

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Clock,
  HardDrive,
} from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import type { UploadedFile } from '../types';

export default function FileUpload() {
  const { uploadedFiles, addUploadedFile, updateFileStatus } = useChatStore();
  const [_uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        const fileId = crypto.randomUUID();
        const newFile: UploadedFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          status: 'uploading',
          progress: 0,
          uploadedAt: Date.now(),
        };

        addUploadedFile(newFile);

        // Simulate upload progress
        setUploading(true);
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          updateFileStatus(fileId, 'uploading', progress);
        }

        // Simulate processing
        updateFileStatus(fileId, 'processing', 100);
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Mark as completed
        updateFileStatus(fileId, 'completed', 100);
        setUploading(false);
      }
    },
    [addUploadedFile, updateFileStatus]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const statusConfig = {
    uploading: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Uploading' },
    processing: { icon: Loader2, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Processing' },
    completed: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Completed' },
    error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Error' },
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-gray-700 hover:border-gray-600 bg-gray-800/30'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              isDragActive ? 'bg-purple-500/20' : 'bg-gray-800'
            }`}
          >
            <Upload
              className={`w-8 h-8 ${isDragActive ? 'text-purple-400' : 'text-gray-500'}`}
            />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-200">
              {isDragActive ? 'Drop your files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse • PDF, TXT, MD, DOC, DOCX • Max 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-300">
              Uploaded Documents ({uploadedFiles.length})
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <HardDrive className="w-3.5 h-3.5" />
              <span>{uploadedFiles.filter((f) => f.status === 'completed').length} processed</span>
            </div>
          </div>

          <div className="space-y-3">
            {uploadedFiles.map((file) => {
              const config = statusConfig[file.status];

              return (
                <div
                  key={file.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 transition-all hover:border-gray-600"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                      <FileText className={`w-5 h-5 ${config.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-200 truncate">{file.name}</p>
                        <button className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{formatSize(file.size)}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(file.uploadedAt)}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {(file.status === 'uploading' || file.status === 'processing') && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={config.color}>{config.label}</span>
                            <span className="text-gray-500">{file.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                file.status === 'processing'
                                  ? 'bg-yellow-500 animate-pulse'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Status Badge */}
                      {file.status === 'completed' && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-xs text-green-400">
                            Indexed successfully • Ready for queries
                          </span>
                        </div>
                      )}

                      {file.status === 'error' && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-xs text-red-400">
                            {file.error || 'Processing failed'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {uploadedFiles.length === 0 && (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No documents uploaded yet</p>
          <p className="text-xs text-gray-600 mt-1">
            Upload documents to start asking questions about them
          </p>
        </div>
      )}
    </div>
  );
}
