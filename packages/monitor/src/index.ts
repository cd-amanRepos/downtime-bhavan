import { createDb } from '@dtb/db';
import { runOneTick } from './loop.js';
import { runOneHtmlTick } from './html-loop.js';
import { recomputeCommunityFlag } from './community-flag.js';
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

const COMMUNITY_FLAG_TICK_MS = 60_000;

function communityTick() {
  try {
    recomputeCommunityFlag(db);
  } catch (err) {
    console.error('[monitor] community flag recompute failed:', err);
  }
}
communityTick(); // run once immediately
setInterval(communityTick, COMMUNITY_FLAG_TICK_MS);

// HTML layer-2 probe — slower cadence than HTTP, 15 min by default.
const HTML_TICK_MS = Number(process.env.DTB_HTML_TICK_MS ?? 15 * 60 * 1000);
let htmlRunning = false;
async function htmlTick() {
  if (htmlRunning) {
    console.log('[monitor] html-tick still in flight, skipping');
    return;
  }
  htmlRunning = true;
  try {
    await runOneHtmlTick(db);
    console.log(`[monitor] html-tick OK ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[monitor] html-tick failed:', err);
  } finally {
    htmlRunning = false;
  }
}
// Delay first HTML probe by 30s so it doesn't pile on top of the first
// HTTP tick at container startup.
setTimeout(() => { htmlTick(); setInterval(htmlTick, HTML_TICK_MS); }, 30_000);

// Keep the event loop alive
process.on('SIGINT', () => { console.log('\n[monitor] shutting down'); process.exit(0); });
