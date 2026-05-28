import { createDb } from '@dtb/db';
import { runOneTick } from './loop.js';
import { resolve } from 'node:path';

// packages/monitor/src/index.ts → climb 3 levels to repo root.
const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
const dbPath = process.env.DTB_DB_PATH ?? resolve(repoRoot, 'data', 'dtb.sqlite');
const intervalMs = Number(process.env.DTB_TICK_MS ?? 2 * 60 * 1000);

const db = createDb(dbPath);

console.log(`[monitor] starting, db=${dbPath}, interval=${intervalMs}ms`);

let running = false;
async function tick() {
  if (running) {
    console.log('[monitor] previous tick still in flight, skipping');
    return;
  }
  running = true;
  try {
    await runOneTick(db);
    console.log(`[monitor] tick OK ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[monitor] tick failed:', err);
  } finally {
    running = false;
  }
}

await tick();                       // run once immediately
setInterval(tick, intervalMs);

// Keep the event loop alive
process.on('SIGINT', () => { console.log('\n[monitor] shutting down'); process.exit(0); });
