import { grievanceBus } from '@/lib/grievance-bus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const encoder = new TextEncoder();

function sseEvent(name: string, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // initial hello
      controller.enqueue(encoder.encode(sseEvent('hello', { ts: Date.now() })));

      const safeEnqueue = (payload: string) => {
        try { controller.enqueue(encoder.encode(payload)); }
        catch { /* client disconnected */ }
      };

      const onNew   = (g: unknown) => safeEnqueue(sseEvent('grievance:new', g));
      const onReact = (g: unknown) => safeEnqueue(sseEvent('grievance:react', g));
      const onHide  = (g: unknown) => safeEnqueue(sseEvent('grievance:hide', g));

      grievanceBus.on('grievance:new', onNew);
      grievanceBus.on('grievance:react', onReact);
      grievanceBus.on('grievance:hide', onHide);

      // keep-alive ping every 25s so proxies don't time out
      const interval = setInterval(() => {
        safeEnqueue(`: ping ${Date.now()}\n\n`);
      }, 25_000);

      cleanup = () => {
        grievanceBus.off('grievance:new', onNew);
        grievanceBus.off('grievance:react', onReact);
        grievanceBus.off('grievance:hide', onHide);
        clearInterval(interval);
      };
    },
    cancel() {
      // Called by Next when the client disconnects.
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
