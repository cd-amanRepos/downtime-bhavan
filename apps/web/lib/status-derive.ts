import type { SiteState } from '@dtb/shared';

/** 30-minute buckets. 24 buckets = 12-hour window.
 *  Picked over 1-hour buckets so fresh installs see bars filling in within
 *  the first hour instead of staring at an empty chart for 24 hours. */
const BUCKET_MS = 30 * 60 * 1000;
const BUCKET_COUNT = 24;

export interface BucketInput {
  checkedAt: number;
  result: 'up' | 'degraded' | 'down';
}

export interface HourBucket {
  hourStart: number;
  state: SiteState | 'unknown';
}

/** Turn a list of recent checks into exactly 24 buckets, oldest first,
 *  ending at `now`. Each bucket spans 30 minutes; the array covers the
 *  last 12 hours. Worst result wins per bucket. */
export function buildLast24h(checks: BucketInput[], now: number): HourBucket[] {
  const buckets: HourBucket[] = [];
  for (let i = BUCKET_COUNT - 1; i >= 0; i--) {
    buckets.push({ hourStart: now - (i + 1) * BUCKET_MS, state: 'unknown' });
  }

  for (const c of checks) {
    const idx = BUCKET_COUNT - 1 - Math.floor((now - c.checkedAt) / BUCKET_MS);
    if (idx < 0 || idx > BUCKET_COUNT - 1) continue;
    buckets[idx]!.state = worstOf(buckets[idx]!.state, c.result);
  }

  return buckets;
}

const rank: Record<SiteState | 'unknown', number> = {
  unknown: 0, working: 1, degraded: 2, down: 3,
};

function worstOf(a: SiteState | 'unknown', b: 'up' | 'degraded' | 'down'): SiteState {
  const mapped: SiteState = b === 'up' ? 'working' : b;
  return rank[mapped] >= rank[a] ? mapped : (a as SiteState);
}
