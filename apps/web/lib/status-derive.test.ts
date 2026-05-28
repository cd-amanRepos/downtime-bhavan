import { describe, it, expect } from 'vitest';
import { buildLast24h } from './status-derive.js';

const HALF_HOUR = 30 * 60 * 1000;

describe('buildLast24h (30-min buckets, 12h window)', () => {
  it('returns 24 buckets, oldest first, all unknown for empty input', () => {
    const now = 1_700_000_000_000;
    const buckets = buildLast24h([], now);
    expect(buckets).toHaveLength(24);
    expect(buckets.every((b) => b.state === 'unknown')).toBe(true);
    expect(buckets[0]!.hourStart).toBeLessThan(buckets[23]!.hourStart);
  });

  it('places a check into the correct 30-min bucket', () => {
    const now = 1_700_000_000_000;
    // 4 half-hours = 2 hours ago, plus a tiny offset to land squarely inside the bucket
    const fourBucketsAgo = now - 4 * HALF_HOUR - 1_000;
    const buckets = buildLast24h(
      [{ checkedAt: fourBucketsAgo, result: 'down' }],
      now,
    );
    // 24 buckets, oldest first. "4 buckets ago" lands at index 19 (24 - 1 - 4).
    expect(buckets[19]!.state).toBe('down');
    expect(buckets[18]!.state).toBe('unknown');
    expect(buckets[20]!.state).toBe('unknown');
  });

  it('worst-of-bucket wins: any down beats degraded beats up', () => {
    const now = 1_700_000_000_000;
    const sameBucket = now - 2 * HALF_HOUR - 30_000;
    const buckets = buildLast24h(
      [
        { checkedAt: sameBucket, result: 'up' },
        { checkedAt: sameBucket + 5_000, result: 'degraded' },
        { checkedAt: sameBucket + 10_000, result: 'down' },
      ],
      now,
    );
    expect(buckets[21]!.state).toBe('down');
  });
});
