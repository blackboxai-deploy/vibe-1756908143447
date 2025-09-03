import { NextRequest, NextResponse } from 'next/server';
import { OCRService } from '@/lib/ocr-service';
import { PDFProcessor } from '@/lib/pdf-processor';

// Disable body parsing for file uploads
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Create a readable stream from the request
    const data = await request.formData();
    const file = data.get('pdf') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Validate PDF
    const pdfProcessor = new PDFProcessor();
    const validation = pdfProcessor.validatePDF(pdfBuffer);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid PDF file' },
        { status: 400 }
      );
    }

    // Create a streaming response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Start processing in the background
    processOCR(pdfBuffer, writer, encoder);

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('OCR processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error during OCR processing' },
      { status: 500 }
    );
  }
}

async function processOCR(
  pdfBuffer: Buffer,
  writer: WritableStreamDefaultWriter<any>,
  encoder: TextEncoder
) {
  try {
    const pdfProcessor = new PDFProcessor();
    const ocrService = new OCRService();

    // Send initial progress
    await writer.write(encoder.encode('data: {"type":"progress","progress":0,"step":"Starting PDF processing"}\n\n'));

    // Convert PDF to images
    const pages = await pdfProcessor.convertPDFToImages(pdfBuffer, (progress, step) => {
      writer.write(encoder.encode(`data: {"type":"progress","progress":${Math.round(progress)},"step":"${step}"}\n\n`));
    });

    if (pages.length === 0) {
      await writer.write(encoder.encode('data: {"type":"error","message":"No pages could be processed from the PDF"}\n\n'));
      await writer.close();
      return;
    }

    // Process OCR
    const result = await ocrService.processPages(pages, (progress, step) => {
      writer.write(encoder.encode(`data: {"type":"progress","progress":${Math.round(progress)},"step":"${step}"}\n\n`));
    });

    // Send completion
    await writer.write(encoder.encode(`data: {"type":"complete","result":${JSON.stringify(result)}}\n\n`));
    await writer.close();

  } catch (error) {
    console.error('OCR processing failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    await writer.write(encoder.encode(`data: {"type":"error","message":"${errorMessage}"}\n\n`));
    await writer.close();
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}