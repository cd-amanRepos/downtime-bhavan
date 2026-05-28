import { EventEmitter } from 'node:events';

/**
 * Single-process pub-sub for grievance events. Survives Next.js hot reload
 * in dev (we attach to globalThis), and is the broadcast channel between
 * the POST /api/grievance handler and the GET /api/grievance/stream SSE.
 *
 * Limitation: this is in-process. If we ever scale to multiple Node
 * instances behind a load balancer, swap for Redis pub-sub. Not needed for
 * V1's single-VM Fly.io deployment.
 */

export interface BusEvents {
  'grievance:new': {
    id: number;
    siteId: string;
    tag: string;
    body: string;
    createdAt: number;
  };
  'grievance:react': { grievanceId: number; kind: string; delta: number };
  'grievance:hide': { grievanceId: number };
}

const KEY = Symbol.for('dtb.grievance-bus');
type Global = typeof globalThis & { [k: symbol]: EventEmitter | undefined };
const g = globalThis as Global;

if (!g[KEY]) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(500); // accommodate many SSE clients
  g[KEY] = emitter;
}

export const grievanceBus = g[KEY]!;

export function emitGrievanceEvent<K extends keyof BusEvents>(
  kind: K,
  payload: BusEvents[K],
): void {
  grievanceBus.emit(kind, payload);
}
