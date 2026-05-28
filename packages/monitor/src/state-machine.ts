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
 * Rules from design spec §5:
 *   - Working → Degraded if the latest check is `down` or `degraded`.
 *   - Degraded → Down if the latest 2 consecutive checks are `down`.
 *   - Down/Degraded → Working if the latest 3 consecutive checks are `up`.
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

  if (prev.state === 'working') {
    if (latest.result === 'up') return { state: 'working', stateSince: prev.stateSince };
    return { state: 'degraded', stateSince: latest.checkedAt };
  }

  if (prev.state === 'degraded') {
    // 2 consecutive down → down. Use checkedAt of the EARLIER (older) of the two.
    if (checks.length >= 2 && checks[0]!.result === 'down' && checks[1]!.result === 'down') {
      return { state: 'down', stateSince: checks[1]!.checkedAt };
    }
    // 3 consecutive up → working
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
