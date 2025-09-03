interface OCRPage {
  pageNumber: number;
  extractedText: string;
  confidence: number;
}

interface OCRResult {
  id: string;
  pages: OCRPage[];
  fullText: string;
  metadata: {
    totalPages: number;
    processingTime: number;
    averageConfidence: number;
  };
}

export class OCRService {
  private readonly endpoint = 'https://oi-server.onrender.com/chat/completions';
  private readonly headers = {
    'customerId': 'susmitgoswami5@gmail.com',
    'Content-Type': 'application/json',
    'Authorization': 'Bearer xxx'
  };

  async processImage(imageBase64: string, pageNumber: number): Promise<OCRPage> {
    const systemPrompt = `You are an expert OCR system specialized in extracting text from handwritten documents. Your task is to:

1. Carefully analyze the handwritten text in the provided image
2. Extract ALL visible text with high accuracy
3. Maintain the original structure and formatting as much as possible
4. Preserve line breaks, paragraphs, and spacing
5. Handle various handwriting styles, sizes, and qualities
6. Return ONLY the extracted text without any additional commentary

Guidelines:
- Extract text exactly as written, including any crossed-out or corrected text
- Preserve the reading order (top to bottom, left to right)
- Maintain paragraph breaks and line spacing
- If text is unclear, make your best educated guess based on context
- Do not add punctuation that isn't clearly present
- Do not correct spelling or grammar errors in the original text
- If you encounter non-text elements (drawings, diagrams), describe them briefly in [brackets]

Return the extracted text in a clean, readable format.`;

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model: 'openrouter/openai/gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract all text from this handwritten page (Page ${pageNumber}). Focus on accuracy and maintaining the original structure.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 4000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OCR API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const extractedText = data.choices?.[0]?.message?.content || '';
      
      // Calculate confidence based on text quality indicators
      const confidence = this.calculateConfidence(extractedText);

      return {
        pageNumber,
        extractedText: extractedText.trim(),
        confidence
      };
    } catch (error) {
      console.error(`OCR processing failed for page ${pageNumber}:`, error);
      return {
        pageNumber,
        extractedText: `[Error processing page ${pageNumber}: ${error instanceof Error ? error.message : 'Unknown error'}]`,
        confidence: 0
      };
    }
  }

  async processPages(
    imageBuffers: Array<{ pageNumber: number; buffer: Buffer }>,
    onProgress?: (progress: number, step: string) => void
  ): Promise<OCRResult> {
    const startTime = Date.now();
    const processingId = `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pages: OCRPage[] = [];
    
    onProgress?.(5, 'Starting OCR processing');

    // Process pages in batches to avoid overwhelming the API
    const batchSize = 3;
    const totalPages = imageBuffers.length;

    for (let i = 0; i < imageBuffers.length; i += batchSize) {
      const batch = imageBuffers.slice(i, i + batchSize);
      const batchPromises = batch.map(async ({ pageNumber, buffer }) => {
        onProgress?.(
          5 + (i / totalPages) * 80,
          `Processing page ${pageNumber} of ${totalPages}`
        );
        
        const base64 = buffer.toString('base64');
        return this.processImage(base64, pageNumber);
      });

      const batchResults = await Promise.all(batchPromises);
      pages.push(...batchResults);

      // Small delay between batches to be respectful to the API
      if (i + batchSize < imageBuffers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    onProgress?.(90, 'Finalizing text extraction');

    // Sort pages by page number
    pages.sort((a, b) => a.pageNumber - b.pageNumber);

    // Combine all text
    const fullText = pages
      .map(page => page.extractedText)
      .join('\n\n--- Page Break ---\n\n');

    // Calculate metadata
    const processingTime = Date.now() - startTime;
    const averageConfidence = pages.reduce((sum, page) => sum + page.confidence, 0) / pages.length;

    onProgress?.(100, 'Processing complete');

    return {
      id: processingId,
      pages,
      fullText,
      metadata: {
        totalPages: pages.length,
        processingTime,
        averageConfidence
      }
    };
  }

  private calculateConfidence(text: string): number {
    // Simple confidence calculation based on text characteristics
    let confidence = 0.7; // Base confidence

    // Factors that increase confidence
    if (text.length > 50) confidence += 0.1; // Substantial text
    if (text.match(/[.!?]/g)?.length || 0 > 0) confidence += 0.05; // Has punctuation
    if (text.match(/\b[A-Z][a-z]+\b/g)?.length || 0 > 3) confidence += 0.05; // Has capitalized words
    if (text.split('\n').length > 2) confidence += 0.05; // Has multiple lines

    // Factors that decrease confidence
    if (text.includes('[Error')) confidence = 0;
    if (text.includes('[unclear]') || text.includes('[?]')) confidence -= 0.2;
    if (text.length < 20) confidence -= 0.2; // Very short text
    if (text.includes('***') || text.includes('???')) confidence -= 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  // Utility method for testing API connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model: 'openrouter/openai/gpt-4o',
          messages: [
            {
              role: 'user',
              content: 'Test connection - please respond with "Connection successful"'
            }
          ],
          max_tokens: 10
        })
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}