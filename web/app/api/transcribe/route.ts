import { NextRequest } from 'next/server';

export const maxDuration = 120;

const SUPPORTED_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac',
  'audio/x-m4a', 'audio/mp4', 'audio/aac', 'audio/x-aac',
]);
const MAX_SIZE = 50 * 1024 * 1024;

function encode(data: string): string {
  return `data: ${data}\n\n`;
}

export async function POST(req: NextRequest) {
  const serviceUrl = process.env.TRANSCRIPTION_SERVICE_URL;
  if (!serviceUrl) {
    return new Response(
      encode(JSON.stringify({ phase: 'error', message: 'Transcription service not configured' })),
      { status: 503, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const key = formData.get('key') as string | null;

  if (!file) {
    return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
  }

  if (!SUPPORTED_TYPES.has(file.type)) {
    return new Response(JSON.stringify({ error: 'Unsupported file type' }), { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return new Response(JSON.stringify({ error: 'File too large (max 50MB)' }), { status: 413 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Phase 1: health check / connecting
        controller.enqueue(encode(JSON.stringify({ phase: 'connecting' })));

        const healthController = new AbortController();
        const healthTimeout = setTimeout(() => healthController.abort(), 70000);

        try {
          const health = await fetch(`${serviceUrl}/health`, {
            signal: healthController.signal,
          });
          clearTimeout(healthTimeout);
          if (!health.ok) throw new Error('Service unhealthy');
        } catch (err) {
          clearTimeout(healthTimeout);
          controller.enqueue(encode(JSON.stringify({
            phase: 'error',
            message: 'Transcription service is unavailable. Please try again.',
          })));
          controller.close();
          return;
        }

        // Phase 2: processing
        controller.enqueue(encode(JSON.stringify({ phase: 'processing' })));

        const outForm = new FormData();
        outForm.append('file', file);
        if (key && key !== 'auto') outForm.append('key', key);

        const procController = new AbortController();
        const procTimeout = setTimeout(() => procController.abort(), 90000);

        const response = await fetch(`${serviceUrl}/transcribe`, {
          method: 'POST',
          body: outForm,
          signal: procController.signal,
        });

        clearTimeout(procTimeout);

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({ message: 'Processing failed' }));
          controller.enqueue(encode(JSON.stringify({
            phase: 'error',
            message: errBody.message ?? 'Transcription failed',
          })));
          controller.close();
          return;
        }

        const result = await response.json();
        controller.enqueue(encode(JSON.stringify({ phase: 'done', result })));
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(encode(JSON.stringify({ phase: 'error', message })));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
