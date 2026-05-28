export interface LeaderboardInput {
  siteId: string;
  name: string;
  uptime30dPct: number | null;
  totalReports: number;
  longestOutageMs: number;
}

export interface RankedSite extends LeaderboardInput {
  rank: number;
  trophy?: string;
}

/** Rank sites worst-uptime first. Award one trophy each for:
 *   - Worst Overall (lowest uptime %)
 *   - Most Reports
 *   - Longest Single Outage
 *  A site can win at most one trophy (priority: Worst > Reports > Outage). */
export function rankSites(input: LeaderboardInput[]): RankedSite[] {
  const sorted = [...input].sort((a, b) => {
    if (a.uptime30dPct === null && b.uptime30dPct === null) return 0;
    if (a.uptime30dPct === null) return 1;
    if (b.uptime30dPct === null) return -1;
    return a.uptime30dPct - b.uptime30dPct;
  });

  const ranked: RankedSite[] = sorted.map((s, i) => ({ ...s, rank: i + 1 }));

  if (ranked.length === 0) return ranked;

  // Worst overall: index 0 of the sorted (lowest uptime)
  ranked[0]!.trophy = '🥇 Worst Overall';

  // Most reports: among the rest
  const mostReports = ranked.slice(1).reduce<RankedSite | null>(
    (best, r) => (best === null || r.totalReports > best.totalReports) ? r : best, null);
  if (mostReports && mostReports.totalReports > 0 && !mostReports.trophy) {
    mostReports.trophy = '🥈 Most Reports';
  }

  // Longest outage: among the rest with no trophy yet
  const longestOutage = ranked.reduce<RankedSite | null>(
    (best, r) => {
      if (r.trophy) return best;
      return (best === null || r.longestOutageMs > best.longestOutageMs) ? r : best;
    }, null);
  if (longestOutage && longestOutage.longestOutageMs > 0) {
    longestOutage.trophy = '🥉 Longest Outage';
  }

  return ranked;
}
