import { NextRequest } from 'next/server';

export const maxDuration = 300;

const MAX_SIZE = 50 * 1024 * 1024;
const SUPPORTED_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac',
  'audio/x-m4a', 'audio/mp4', 'audio/aac', 'audio/x-aac',
]);

function encode(data: string): string {
  return `data: ${data}\n\n`;
}

export async function POST(req: NextRequest) {
  const serviceUrl = process.env.TRANSCRIPTION_SERVICE_URL;
  if (!serviceUrl) {
    return new Response(
      encode(JSON.stringify({ phase: 'error', code: 'no_service', message: 'Transcription service not configured' })),
      { status: 503, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  let formData: FormData;
  try { formData = await req.formData(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid form' }), { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const segmentStart = formData.get('segment_start') as string | null;
  const segmentEnd = formData.get('segment_end') as string | null;
  const melodySource = formData.get('melody_source') as string | null;
  const includeBass = formData.get('include_bass_for_low') as string | null;

  if (!file) return new Response(JSON.stringify({ error: 'No file' }), { status: 400 });
  if (!SUPPORTED_TYPES.has(file.type)) {
    return new Response(encode(JSON.stringify({ phase: 'error', code: 'unsupported_format', message: 'Unsupported file type' })),
      { headers: { 'Content-Type': 'text/event-stream' } });
  }
  if (file.size > MAX_SIZE) {
    return new Response(encode(JSON.stringify({ phase: 'error', code: 'file_too_large', message: 'File exceeds 50MB limit' })),
      { headers: { 'Content-Type': 'text/event-stream' } });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: string) => {
        try { controller.enqueue(new TextEncoder().encode(data)); } catch { /* closed */ }
      };

      try {
        enqueue(encode(JSON.stringify({ phase: 'connecting', message: 'Connecting to transcription service...' })));

        const healthCtrl = new AbortController();
        const healthTimeout = setTimeout(() => healthCtrl.abort(), 70000);
        try {
          const health = await fetch(`${serviceUrl}/health`, { signal: healthCtrl.signal });
          clearTimeout(healthTimeout);
          if (!health.ok) throw new Error('unhealthy');
        } catch {
          clearTimeout(healthTimeout);
          enqueue(encode(JSON.stringify({ phase: 'error', code: 'service_unavailable', message: 'Transcription service is not responding.' })));
          controller.close();
          return;
        }

        const outForm = new FormData();
        outForm.append('file', file);
        if (segmentStart) outForm.append('segment_start', segmentStart);
        if (segmentEnd) outForm.append('segment_end', segmentEnd);
        if (melodySource) outForm.append('melody_source', melodySource);
        if (includeBass) outForm.append('include_bass_for_low', includeBass);

        const procCtrl = new AbortController();
        const procTimeout = setTimeout(() => procCtrl.abort(), 290000);

        const response = await fetch(`${serviceUrl}/transcribe-file`, {
          method: 'POST',
          body: outForm,
          signal: procCtrl.signal,
        });
        clearTimeout(procTimeout);

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              enqueue(line.trim() + '\n\n');
            }
          }
        }
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        enqueue(encode(JSON.stringify({ phase: 'error', code: 'pipeline_error', message: msg })));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
