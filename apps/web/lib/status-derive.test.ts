import { describe, it, expect } from 'vitest';
import { buildLast24h } from './status-derive.js';

const hour = 60 * 60 * 1000;

describe('buildLast24h', () => {
  it('returns 24 buckets, oldest first, all unknown for empty input', () => {
    const now = 1_700_000_000_000;
    const buckets = buildLast24h([], now);
    expect(buckets).toHaveLength(24);
    expect(buckets.every((b) => b.state === 'unknown')).toBe(true);
    expect(buckets[0]!.hourStart).toBeLessThan(buckets[23]!.hourStart);
  });

  it('places a check into the correct hour bucket', () => {
    const now = 1_700_000_000_000;
    const fourHoursAgo = now - 4 * hour - 1_000;
    const buckets = buildLast24h(
      [{ checkedAt: fourHoursAgo, result: 'down' }],
      now,
    );
    // 24 buckets, oldest first. The "4 hours ago" bucket is at index 19 (24 - 1 - 4).
    expect(buckets[19]!.state).toBe('down');
    expect(buckets[18]!.state).toBe('unknown');
    expect(buckets[20]!.state).toBe('unknown');
  });

  it('worst-of-hour wins: any down beats degraded beats up', () => {
    const now = 1_700_000_000_000;
    const sameHour = now - 2 * hour - 30_000;
    const buckets = buildLast24h(
      [
        { checkedAt: sameHour, result: 'up' },
        { checkedAt: sameHour + 5_000, result: 'degraded' },
        { checkedAt: sameHour + 10_000, result: 'down' },
      ],
      now,
    );
    expect(buckets[21]!.state).toBe('down');
  });
});
