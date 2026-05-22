import { NextRequest } from 'next/server';

export const maxDuration = 300;

const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;

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

  let body: { url?: string; segment_start?: number; segment_end?: number; melody_source?: string; include_bass_for_low?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { url, segment_start, segment_end, melody_source, include_bass_for_low } = body;

  if (!url || !YT_REGEX.test(url)) {
    return new Response(
      encode(JSON.stringify({ phase: 'error', code: 'invalid_url', message: 'Not a valid YouTube URL' })),
      { headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: string) => {
        try { controller.enqueue(new TextEncoder().encode(data)); } catch { /* closed */ }
      };

      try {
        // Health check first
        enqueue(encode(JSON.stringify({ phase: 'connecting', message: 'Connecting to transcription service...' })));

        const healthCtrl = new AbortController();
        const healthTimeout = setTimeout(() => healthCtrl.abort(), 70000);
        try {
          const health = await fetch(`${serviceUrl}/health`, { signal: healthCtrl.signal });
          clearTimeout(healthTimeout);
          if (!health.ok) throw new Error('unhealthy');
        } catch {
          clearTimeout(healthTimeout);
          enqueue(encode(JSON.stringify({ phase: 'error', code: 'service_unavailable', message: 'Transcription service is not responding. Please try again.' })));
          controller.close();
          return;
        }

        // Forward to Python service
        const formData = new FormData();
        formData.append('url', url);
        if (segment_start != null) formData.append('segment_start', String(segment_start));
        if (segment_end != null) formData.append('segment_end', String(segment_end));
        if (melody_source) formData.append('melody_source', melody_source);
        if (include_bass_for_low != null) formData.append('include_bass_for_low', String(include_bass_for_low));

        const procCtrl = new AbortController();
        const procTimeout = setTimeout(() => procCtrl.abort(), 290000);

        const response = await fetch(`${serviceUrl}/transcribe-youtube`, {
          method: 'POST',
          body: formData,
          signal: procCtrl.signal,
        });
        clearTimeout(procTimeout);

        if (!response.body) throw new Error('No response body from service');

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
