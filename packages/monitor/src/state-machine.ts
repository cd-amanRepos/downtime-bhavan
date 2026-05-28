import type { CheckResult, SiteState } from '@dtb/shared';

export interface PreviousState {
  state: SiteState;
  stateSince: number;
}

export interface NextState {
  state: SiteState;
  stateSince: number;
}

/**
 * Derive the next site state from the previous state and the most recent
 * checks (oldest → newest order does not matter; we sort here).
 *
 * Layer-aware rules (spec §5 + v1.3.0 HTML layer-2):
 *   - Working → Degraded on any failed check (HTTP OR HTML).
 *   - Degraded → Down ONLY on 2 consecutive failed HTTP checks. An HTML
 *     check failing keeps the site Degraded — semantically, the server
 *     is reachable but the page is broken; that's not "Down".
 *   - Down / Degraded → Working when the latest 3 checks (any layer)
 *     are `up`. Recovery requires every recent observation to be clean,
 *     so a flaky HTML check still blocks the promotion.
 *
 * `stateSince` is updated only when the state changes — set to the
 * `checkedAt` of the FIRST check in the run that caused the transition.
 */
export function deriveNextState(
  prev: PreviousState,
  recent: readonly CheckResult[],
): NextState {
  // Sort newest-first for easier reasoning.
  const checks = [...recent].sort((a, b) => b.checkedAt - a.checkedAt);
  if (checks.length === 0) return { state: prev.state, stateSince: prev.stateSince };

  const latest = checks[0]!;
  const httpChecks = checks.filter((c) => c.layer === 'http');

  if (prev.state === 'working') {
    if (latest.result === 'up') return { state: 'working', stateSince: prev.stateSince };
    return { state: 'degraded', stateSince: latest.checkedAt };
  }

  if (prev.state === 'degraded') {
    // 2 consecutive HTTP failures → Down. Only HTTP escalates here —
    // HTML failures keep the site in Degraded because the server is up.
    if (
      httpChecks.length >= 2 &&
      httpChecks[0]!.result === 'down' &&
      httpChecks[1]!.result === 'down'
    ) {
      return { state: 'down', stateSince: httpChecks[1]!.checkedAt };
    }
    if (consecutiveAtTop(checks, 'up', 3)) {
      return { state: 'working', stateSince: checks[2]!.checkedAt };
    }
    return { state: 'degraded', stateSince: prev.stateSince };
  }

  // prev.state === 'down'
  if (consecutiveAtTop(checks, 'up', 3)) {
    return { state: 'working', stateSince: checks[2]!.checkedAt };
  }
  return { state: 'down', stateSince: prev.stateSince };
}

function consecutiveAtTop(
  checks: readonly CheckResult[],
  expected: CheckResult['result'],
  n: number,
): boolean {
  if (checks.length < n) return false;
  for (let i = 0; i < n; i++) {
    if (checks[i]!.result !== expected) return false;
  }
  return true;
}
