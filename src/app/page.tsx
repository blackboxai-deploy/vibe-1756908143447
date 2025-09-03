"use client";

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import ProgressTracker from '@/components/ProgressTracker';
import TextViewer from '@/components/TextViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProcessingResult {
  id: string;
  pages: Array<{
    pageNumber: number;
    extractedText: string;
    confidence: number;
  }>;
  fullText: string;
  metadata: {
    totalPages: number;
    processingTime: number;
    averageConfidence: number;
  };
}

export default function OCRApp() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState('');

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress') {
                setProgress(data.progress);
                setCurrentStep(data.step);
              } else if (data.type === 'complete') {
                setResult(data.result);
                setIsProcessing(false);
              } else if (data.type === 'error') {
                setError(data.message);
                setIsProcessing(false);
              }
            } catch (e) {
              console.warn('Failed to parse progress data:', line);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setIsProcessing(false);
    setProgress(0);
    setCurrentStep('');
    setResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              PDF OCR Text Extractor
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Extract text from handwritten PDFs using advanced AI-powered OCR technology. 
              Upload your document and get structured, searchable text output.
            </p>
          </div>

          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" disabled={isProcessing}>
                Upload PDF
              </TabsTrigger>
              <TabsTrigger value="processing" disabled={!isProcessing && !result}>
                Processing
              </TabsTrigger>
              <TabsTrigger value="results" disabled={!result}>
                Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Your PDF Document</CardTitle>
                  <CardDescription>
                    Select a PDF file with handwritten notes to extract text. 
                    Supports files up to 50MB and 500 pages.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUpload 
                    onFileSelect={handleFileUpload}
                    disabled={isProcessing}
                    onReset={handleReset}
                  />
                  {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 font-medium">Error:</p>
                      <p className="text-red-700">{error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="processing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Processing Your Document</CardTitle>
                  <CardDescription>
                    Please wait while we extract text from your PDF using advanced OCR technology.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProgressTracker 
                    progress={progress}
                    currentStep={currentStep}
                    isProcessing={isProcessing}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              {result && (
                <TextViewer 
                  result={result}
                  onReset={handleReset}
                />
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-12 text-center">
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                How It Works
              </h3>
              <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-600">
                <div>
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">
                    1
                  </div>
                  <p>Upload your handwritten PDF document securely</p>
                </div>
                <div>
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">
                    2
                  </div>
                  <p>AI analyzes each page and extracts text with high accuracy</p>
                </div>
                <div>
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">
                    3
                  </div>
                  <p>Download structured text in multiple formats</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}