import type { SiteState } from '@dtb/shared';

const HOUR = 60 * 60 * 1000;

export interface BucketInput {
  checkedAt: number;
  result: 'up' | 'degraded' | 'down';
}

export interface HourBucket {
  hourStart: number;
  state: SiteState | 'unknown';
}

/** Turn a list of recent checks into exactly 24 hourly buckets,
 *  oldest first, ending at `now`. Worst result wins per hour. */
export function buildLast24h(checks: BucketInput[], now: number): HourBucket[] {
  const buckets: HourBucket[] = [];
  for (let i = 23; i >= 0; i--) {
    buckets.push({ hourStart: now - (i + 1) * HOUR, state: 'unknown' });
  }

  for (const c of checks) {
    const idx = 24 - 1 - Math.floor((now - c.checkedAt) / HOUR);
    if (idx < 0 || idx > 23) continue;
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
