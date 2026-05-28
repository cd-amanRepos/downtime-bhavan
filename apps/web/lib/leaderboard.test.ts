import { describe, it, expect } from 'vitest';
import { rankSites, type LeaderboardInput } from './leaderboard.js';

describe('rankSites', () => {
  it('ranks worst uptime first', () => {
    const input: LeaderboardInput[] = [
      { siteId: 'a', name: 'A', uptime30dPct: 92, totalReports: 0, longestOutageMs: 0 },
      { siteId: 'b', name: 'B', uptime30dPct: 31, totalReports: 0, longestOutageMs: 0 },
      { siteId: 'c', name: 'C', uptime30dPct: 67, totalReports: 0, longestOutageMs: 0 },
    ];
    const ranked = rankSites(input);
    expect(ranked.map((r) => r.siteId)).toEqual(['b', 'c', 'a']);
  });

  it('handles null uptime by sorting it last', () => {
    const input: LeaderboardInput[] = [
      { siteId: 'a', name: 'A', uptime30dPct: 31, totalReports: 0, longestOutageMs: 0 },
      { siteId: 'b', name: 'B', uptime30dPct: null, totalReports: 0, longestOutageMs: 0 },
    ];
    const ranked = rankSites(input);
    expect(ranked[0]!.siteId).toBe('a');
    expect(ranked[1]!.siteId).toBe('b');
  });

  it('awards trophies', () => {
    const input: LeaderboardInput[] = [
      { siteId: 'worst', name: 'Worst', uptime30dPct: 12, totalReports: 100, longestOutageMs: 50 * 60 * 60 * 1000 },
      { siteId: 'most-reports', name: 'MR', uptime30dPct: 60, totalReports: 500, longestOutageMs: 1000 },
      { siteId: 'longest-outage', name: 'LO', uptime30dPct: 70, totalReports: 10, longestOutageMs: 100 * 60 * 60 * 1000 },
    ];
    const ranked = rankSites(input);
    expect(ranked.find((r) => r.siteId === 'worst')?.trophy).toMatch(/Worst Overall/i);
    expect(ranked.find((r) => r.siteId === 'most-reports')?.trophy).toMatch(/Most Reports/i);
    expect(ranked.find((r) => r.siteId === 'longest-outage')?.trophy).toMatch(/Longest Outage/i);
  });
});
