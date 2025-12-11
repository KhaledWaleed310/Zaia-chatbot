import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { DocumentIcon, XMarkIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { UploadProgress } from '@/types';

interface FileUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: Record<string, string[]>;
  maxSize?: number;
  maxFiles?: number;
  className?: string;
}

export default function FileUploader({
  onUpload,
  accept = {
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 10,
  className,
}: FileUploaderProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);

      // Initialize progress tracking
      const progress: UploadProgress[] = acceptedFiles.map((file) => ({
        file,
        progress: 0,
        status: 'pending',
      }));
      setUploadProgress(progress);

      try {
        // Update to uploading status
        setUploadProgress((prev) =>
          prev.map((p) => ({ ...p, status: 'uploading' as const }))
        );

        // Upload files
        await onUpload(acceptedFiles);

        // Mark as completed
        setUploadProgress((prev) =>
          prev.map((p) => ({ ...p, status: 'completed' as const, progress: 100 }))
        );

        // Clear after delay
        setTimeout(() => {
          setUploadProgress([]);
        }, 3000);
      } catch (error) {
        // Mark as failed
        setUploadProgress((prev) =>
          prev.map((p) => ({
            ...p,
            status: 'failed' as const,
            error: error instanceof Error ? error.message : 'Upload failed',
          }))
        );
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
    disabled: uploading,
  });

  const removeFile = (index: number) => {
    setUploadProgress((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500',
          uploading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          or click to browse
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Supports PDF, TXT, MD, DOC, DOCX (max {maxSize / 1024 / 1024}MB per file)
        </p>
      </div>

      {/* File rejections */}
      {fileRejections.length > 0 && (
        <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                Some files were rejected
              </h3>
              <ul className="mt-2 text-sm text-red-700 dark:text-red-500 list-disc list-inside">
                {fileRejections.map(({ file, errors }) => (
                  <li key={file.name}>
                    {file.name}: {errors.map((e) => e.message).join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadProgress.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <DocumentIcon className="h-8 w-8 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {item.file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(item.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {item.status === 'uploading' && (
                  <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-primary-600 dark:bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
                {item.status === 'failed' && item.error && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {item.error}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                {item.status === 'completed' && (
                  <CheckCircleIcon className="h-6 w-6 text-green-500" />
                )}
                {item.status === 'failed' && (
                  <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
                )}
                {item.status === 'uploading' && (
                  <div className="spinner w-6 h-6" />
                )}
                {!uploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
