'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { File, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type DocumentFile = {
  file: File;
  type: string;
  description: string;
  isUploading?: boolean;
  progress?: number;
  error?: string;
};

interface DocumentUploadProps {
  onUpload: (files: DocumentFile[]) => Promise<void>;
  accept?: Record<string, string[]>;
  maxSize?: number;
  maxFiles?: number;
  className?: string;
}

export function DocumentUpload({
  onUpload,
  accept = {
    'application/pdf': ['.pdf'],
    'image/*': ['.jpg', '.jpeg', '.png'],
  },
  maxSize = 5 * 1024 * 1024, // 5MB
  maxFiles = 5,
  className,
}: DocumentUploadProps) {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) => ({
        file,
        type: '',
        description: '',
        isUploading: false,
        progress: 0,
      }));

      setFiles((prev) => {
        const updated = [...prev, ...newFiles];
        return updated.slice(0, maxFiles);
      });
    },
    [maxFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
    disabled: isUploading || files.length >= maxFiles,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFile = (index: number, updates: Partial<DocumentFile>) => {
    setFiles((prev) =>
      prev.map((file, i) => (i === index ? { ...file, ...updates } : file)),
    );
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    
    try {
      // Update all files to show uploading state
      setFiles((prev) =>
        prev.map((file) => ({ ...file, isUploading: true, progress: 0 })),
      );

      // Simulate upload progress
      const totalFiles = files.length;
      let completedFiles = 0;

      for (let i = 0; i < totalFiles; i++) {
        const interval = setInterval(() => {
          setFiles((prev) =>
            prev.map((file, idx) =>
              idx === i && file.progress! < 90
                ? { ...file, progress: (file.progress || 0) + 10 }
                : file,
            ),
          );
        }, 200);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000));
        clearInterval(interval);

        // Update progress to 100%
        setFiles((prev) =>
          prev.map((file, idx) =>
            idx === i ? { ...file, progress: 100, isUploading: false } : file,
          ),
        );

        completedFiles++;
      }

      await onUpload(files);
    } catch (error) {
      console.error('Upload failed:', error);
      // Update all files to show error state
      setFiles((prev) =>
        prev.map((file) => ({
          ...file,
          isUploading: false,
          error: 'Upload failed. Please try again.',
        })),
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          (isUploading || files.length >= maxFiles) && 'opacity-50 cursor-not-allowed',
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            {isDragActive ? (
              <p>Drop the files here</p>
            ) : (
              <p>
                Drag & drop files here, or click to select files
                <br />
                <span className="text-xs">
                  (PDF, JPG, PNG up to {maxSize / 1024 / 1024}MB, max {maxFiles} files)
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 space-y-2 relative"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <File className="h-5 w-5 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="space-y-1">
                    <label
                      htmlFor={`document-type-${index}`}
                      className="text-xs font-medium"
                    >
                      Document Type
                    </label>
                    <select
                      id={`document-type-${index}`}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={file.type}
                      onChange={(e) =>
                        updateFile(index, { type: e.target.value })
                      }
                      disabled={isUploading}
                    >
                      <option value="">Select document type</option>
                      <option value="terms">Terms and Conditions</option>
                      <option value="policy">Policy Document</option>
                      <option value="brochure">Product Brochure</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor={`document-desc-${index}`}
                      className="text-xs font-medium"
                    >
                      Description (optional)
                    </label>
                    <input
                      id={`document-desc-${index}`}
                      type="text"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Brief description of this document"
                      value={file.description}
                      onChange={(e) =>
                        updateFile(index, { description: e.target.value })
                      }
                      disabled={isUploading}
                    />
                  </div>

                  {file.progress !== undefined && file.progress > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {file.isUploading ? 'Uploading...' : 'Uploaded'}
                        </span>
                        <span>{Math.round(file.progress)}%</span>
                      </div>
                      <Progress value={file.progress} className="h-2" />
                    </div>
                  )}

                  {file.error && (
                    <p className="text-xs text-destructive">{file.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || files.every((f) => f.isUploading)}
            >
              {isUploading ? 'Uploading...' : 'Upload Documents'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
