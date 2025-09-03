"use client";

import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';

interface ProgressTrackerProps {
  progress: number;
  currentStep: string;
  isProcessing: boolean;
}

export default function ProgressTracker({ progress, currentStep, isProcessing }: ProgressTrackerProps) {
  const steps = [
    { name: 'Uploading file', description: 'Securely uploading your PDF document' },
    { name: 'Converting PDF', description: 'Converting PDF pages to high-quality images' },
    { name: 'Processing pages', description: 'Analyzing handwriting using AI OCR technology' },
    { name: 'Extracting text', description: 'Converting recognized text to structured format' },
    { name: 'Finalizing', description: 'Preparing your results for download' },
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => 
      currentStep.toLowerCase().includes(step.name.toLowerCase().split(' ')[0])
    );
  };

  const currentStepIndex = getCurrentStepIndex();

  const getEstimatedTime = (progress: number): string => {
    if (progress === 0) return 'Calculating...';
    if (progress < 10) return '5-15 minutes';
    if (progress < 25) return '3-10 minutes';
    if (progress < 50) return '2-8 minutes';
    if (progress < 75) return '1-5 minutes';
    if (progress < 95) return '30 seconds - 2 minutes';
    return 'Almost done...';
  };

  return (
    <div className="space-y-6">
      {/* Main Progress Bar */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Processing Progress</h3>
          <span className="text-sm font-medium text-gray-600">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-3" />
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            {isProcessing ? currentStep || 'Initializing...' : 'Processing complete'}
          </span>
          <span className="text-gray-500">
            Estimated time: {getEstimatedTime(progress)}
          </span>
        </div>
      </div>

      {/* Step Progress */}
      <Card>
        <CardContent className="p-6">
          <h4 className="font-medium text-gray-900 mb-4">Processing Steps</h4>
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isCompleted = index < currentStepIndex || (!isProcessing && progress === 100);
              const isCurrent = index === currentStepIndex && isProcessing;

              return (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted ? (
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : isCurrent ? (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      isCompleted ? 'text-green-700' : 
                      isCurrent ? 'text-blue-700' : 
                      'text-gray-500'
                    }`}>
                      {step.name}
                    </p>
                    <p className={`text-xs ${
                      isCompleted ? 'text-green-600' : 
                      isCurrent ? 'text-blue-600' : 
                      'text-gray-400'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                  {isCurrent && (
                    <div className="flex-shrink-0">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Processing Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h5 className="text-sm font-medium text-blue-900 mb-1">Processing Information</h5>
              <p className="text-xs text-blue-800">
                We use advanced AI technology to analyze your handwritten text. Processing time depends on 
                document length, handwriting complexity, and image quality. Large documents may take several minutes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}