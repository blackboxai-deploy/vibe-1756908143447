"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import ExportOptions from '@/components/ExportOptions';

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

interface TextViewerProps {
  result: ProcessingResult;
  onReset: () => void;
}

export default function TextViewer({ result, onReset }: TextViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'pages'>('full');

  const filteredPages = result.pages.filter(page =>
    searchTerm === '' || 
    page.extractedText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? 
        `<mark class="bg-yellow-200 px-1 rounded">${part}</mark>` : 
        part
    ).join('');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="space-y-6">
      {/* Results Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Text Extraction Complete</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Successfully processed {result.metadata.totalPages} pages in {formatProcessingTime(result.metadata.processingTime)}
              </p>
            </div>
            <Button variant="outline" onClick={onReset}>
              Process New Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{result.metadata.totalPages}</p>
              <p className="text-sm text-blue-800">Pages Processed</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {(result.metadata.averageConfidence * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-green-800">Average Confidence</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {result.fullText.split(' ').length.toLocaleString()}
              </p>
              <p className="text-sm text-purple-800">Words Extracted</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Search extracted text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'full' | 'pages')}>
              <TabsList>
                <TabsTrigger value="full">Full Text</TabsTrigger>
                <TabsTrigger value="pages">By Pages</TabsTrigger>
              </TabsList>
            </Tabs>
            <ExportOptions result={result} />
          </div>
          {searchTerm && (
            <p className="text-sm text-gray-600 mt-2">
              Found {filteredPages.length} pages containing "{searchTerm}"
            </p>
          )}
        </CardContent>
      </Card>

      {/* Text Content */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={viewMode} className="w-full">
            <TabsContent value="full" className="mt-0">
              <ScrollArea className="h-96 p-6">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: highlightText(result.fullText, searchTerm)
                      .replace(/\n/g, '<br>')
                  }}
                />
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="pages" className="mt-0">
              <div className="flex">
                {/* Page List */}
                <div className="w-64 border-r bg-gray-50">
                  <ScrollArea className="h-96">
                    <div className="p-4 space-y-2">
                      {filteredPages.map((page) => (
                        <Button
                          key={page.pageNumber}
                          variant={selectedPage === page.pageNumber ? "default" : "ghost"}
                          className="w-full justify-between p-3 h-auto"
                          onClick={() => setSelectedPage(page.pageNumber)}
                        >
                          <div className="text-left">
                            <p className="font-medium">Page {page.pageNumber}</p>
                            <p className="text-xs text-gray-500">
                              {page.extractedText.substring(0, 50)}...
                            </p>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={getConfidenceColor(page.confidence)}
                          >
                            {(page.confidence * 100).toFixed(0)}%
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Page Content */}
                <div className="flex-1">
                  <ScrollArea className="h-96">
                    <div className="p-6">
                      {selectedPage !== null ? (
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Page {selectedPage}</h3>
                            <Badge 
                              className={getConfidenceColor(
                                result.pages.find(p => p.pageNumber === selectedPage)?.confidence || 0
                              )}
                            >
                              Confidence: {((result.pages.find(p => p.pageNumber === selectedPage)?.confidence || 0) * 100).toFixed(1)}%
                            </Badge>
                          </div>
                          <div 
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: highlightText(
                                result.pages.find(p => p.pageNumber === selectedPage)?.extractedText || '',
                                searchTerm
                              ).replace(/\n/g, '<br>')
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 mt-8">
                          <p>Select a page from the list to view its extracted text</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}