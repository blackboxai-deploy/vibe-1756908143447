"use client";

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  onReset: () => void;
}

export default function FileUpload({ onFileSelect, disabled = false, onReset }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Please select a PDF file';
    }
    
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return 'File size must be less than 50MB';
    }
    
    return null;
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const error = validateFile(file);
    
    if (error) {
      alert(error);
      return;
    }
    
    setSelectedFile(file);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  }, [disabled, handleFiles]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleStartProcessing = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    onReset();
  };

  return (
    <div className="space-y-4">
      <Card 
        className={`
          border-2 border-dashed transition-colors duration-200 cursor-pointer
          ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${selectedFile ? 'border-green-400 bg-green-50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
          {!selectedFile ? (
            <>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Drop your PDF here, or click to browse
              </h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                Select a PDF file with handwritten notes (up to 50MB, 500 pages max)
              </p>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleChange}
                disabled={disabled}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={disabled}
              >
                Select PDF File
              </Button>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">File Selected</h3>
              <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                <p className="font-medium text-gray-900 mb-1">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Last modified: {new Date(selectedFile.lastModified).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleStartProcessing}
                  disabled={disabled}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Start OCR Processing
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={disabled}
                >
                  Choose Different File
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500 text-center">
        <p>Supported format: PDF • Maximum file size: 50MB • Maximum pages: 500</p>
        <p className="mt-1">Your files are processed securely and not stored on our servers</p>
      </div>
    </div>
  );
}