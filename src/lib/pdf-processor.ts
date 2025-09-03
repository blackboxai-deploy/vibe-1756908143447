import { fromBuffer as pdf2picFromBuffer } from 'pdf2pic';
import sharp from 'sharp';

export interface ProcessedPage {
  pageNumber: number;
  buffer: Buffer;
}

export class PDFProcessor {
  async convertPDFToImages(
    pdfBuffer: Buffer,
    onProgress?: (progress: number, step: string) => void
  ): Promise<ProcessedPage[]> {
    try {
      onProgress?.(10, 'Analyzing PDF structure');

      // Configure PDF to image conversion
      const convert = pdf2picFromBuffer(pdfBuffer, {
        density: 200, // DPI - higher for better OCR accuracy
        saveFilename: "page",
        savePath: "./temp",
        format: "jpg",
        width: 2000, // Max width for good quality
        height: 2600, // Max height for good quality
        quality: 95 // High quality for OCR
      });

      onProgress?.(20, 'Converting PDF pages to images');

      // Get total number of pages first
      const firstPage = await convert(1, { responseType: 'buffer' });
      if (!firstPage.buffer) {
        throw new Error('Failed to convert first page');
      }

      // Try to estimate total pages by attempting conversion
      let totalPages = 1;
      try {
        // Test with a reasonable upper bound to find actual page count
        for (let i = 2; i <= 500; i++) {
          try {
            await convert(i, { responseType: 'buffer' });
            totalPages = i;
          } catch {
            break; // No more pages
          }
        }
      } catch (error) {
        console.warn('Could not determine exact page count, proceeding with available pages');
      }

      onProgress?.(30, `Converting ${totalPages} pages`);

      const processedPages: ProcessedPage[] = [];
      
      // Process pages in parallel batches for better performance
      const batchSize = 5;
      for (let i = 1; i <= totalPages; i += batchSize) {
        const batchPromises: Promise<ProcessedPage | null>[] = [];
        
        for (let j = i; j < Math.min(i + batchSize, totalPages + 1); j++) {
          batchPromises.push(this.processPage(convert, j));
        }

        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter((result): result is ProcessedPage => result !== null);
        processedPages.push(...validResults);

        const progress = 30 + (i / totalPages) * 50;
        onProgress?.(progress, `Processed ${Math.min(i + batchSize - 1, totalPages)} of ${totalPages} pages`);
      }

      onProgress?.(85, 'Optimizing images for OCR');

      // Sort by page number to ensure correct order
      processedPages.sort((a, b) => a.pageNumber - b.pageNumber);

      return processedPages;
    } catch (error) {
      console.error('PDF processing error:', error);
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processPage(
    convert: any,
    pageNumber: number
  ): Promise<ProcessedPage | null> {
    try {
      const result = await convert(pageNumber, { responseType: 'buffer' });
      
      if (!result.buffer) {
        console.warn(`No buffer returned for page ${pageNumber}`);
        return null;
      }

      // Optimize the image for OCR processing
      const optimizedBuffer = await this.optimizeImageForOCR(result.buffer);

      return {
        pageNumber,
        buffer: optimizedBuffer
      };
    } catch (error) {
      console.error(`Failed to process page ${pageNumber}:`, error);
      return null;
    }
  }

  private async optimizeImageForOCR(inputBuffer: Buffer): Promise<Buffer> {
    try {
      // Use Sharp to optimize the image for better OCR results
      return await sharp(inputBuffer)
        .resize(2000, 2600, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 95,
          progressive: false 
        })
        .normalize() // Improve contrast
        .sharpen() // Enhance text clarity
        .toBuffer();
    } catch (error) {
      console.warn('Image optimization failed, using original:', error);
      return inputBuffer;
    }
  }

  // Utility method to validate PDF buffer
  validatePDF(buffer: Buffer): { isValid: boolean; error?: string } {
    try {
      // Basic PDF header validation
      const header = buffer.subarray(0, 8).toString();
      if (!header.startsWith('%PDF-')) {
        return { isValid: false, error: 'Invalid PDF format' };
      }

      // Check minimum file size (1KB)
      if (buffer.length < 1024) {
        return { isValid: false, error: 'PDF file too small' };
      }

      // Check maximum file size (50MB)
      if (buffer.length > 50 * 1024 * 1024) {
        return { isValid: false, error: 'PDF file too large (max 50MB)' };
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: `PDF validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Method to estimate processing time
  estimateProcessingTime(fileSizeBytes: number): number {
    // Rough estimation: 2-3 seconds per MB for OCR processing
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    return Math.max(30, fileSizeMB * 2.5 * 1000); // minimum 30 seconds
  }
}