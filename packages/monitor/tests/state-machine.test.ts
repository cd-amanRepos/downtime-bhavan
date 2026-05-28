import { describe, it, expect } from 'vitest';
import { deriveNextState } from '../src/state-machine.js';
import type { CheckResult, SiteState } from '@dtb/shared';

const t = (offset: number) => 1_700_000_000_000 + offset * 1_000;

const httpCheck = (
  offset: number,
  result: 'up' | 'down' | 'degraded',
): CheckResult => ({
  siteId: 's',
  layer: 'http',
  result,
  checkedAt: t(offset),
});

describe('deriveNextState', () => {
  it('stays Working when all recent checks pass', () => {
    const prev = { state: 'working' as SiteState, stateSince: t(-300) };
    const recent = [httpCheck(-60, 'up'), httpCheck(-120, 'up'), httpCheck(-180, 'up')];
    const result = deriveNextState(prev, recent);
    expect(result.state).toBe('working');
    expect(result.stateSince).toBe(t(-300));
  });

  it('transitions Working → Degraded after a single HTTP failure', () => {
    const prev = { state: 'working' as SiteState, stateSince: t(-300) };
    const recent = [httpCheck(-30, 'down'), httpCheck(-90, 'up'), httpCheck(-150, 'up')];
    const result = deriveNextState(prev, recent);
    expect(result.state).toBe('degraded');
    expect(result.stateSince).toBe(t(-30));
  });

  it('transitions Degraded → Down after 2 consecutive HTTP failures (≥4 min)', () => {
    const prev = { state: 'degraded' as SiteState, stateSince: t(-180) };
    const recent = [httpCheck(-30, 'down'), httpCheck(-150, 'down'), httpCheck(-270, 'up')];
    const result = deriveNextState(prev, recent);
    expect(result.state).toBe('down');
    expect(result.stateSince).toBe(t(-150));
  });

  it('stays Down while HTTP keeps failing', () => {
    const prev = { state: 'down' as SiteState, stateSince: t(-600) };
    const recent = [httpCheck(-30, 'down'), httpCheck(-150, 'down'), httpCheck(-270, 'down')];
    const result = deriveNextState(prev, recent);
    expect(result.state).toBe('down');
    expect(result.stateSince).toBe(t(-600));
  });

  it('transitions Down → Working only after 3 consecutive successes ≥5min', () => {
    const prev = { state: 'down' as SiteState, stateSince: t(-3600) };
    const recent = [
      httpCheck(-30, 'up'),
      httpCheck(-150, 'up'),
      httpCheck(-270, 'up'),
      httpCheck(-390, 'down'),
    ];
    const result = deriveNextState(prev, recent);
    expect(result.state).toBe('working');
    expect(result.stateSince).toBe(t(-270));
  });

  it('does NOT transition Down → Working with only 2 successes', () => {
    const prev = { state: 'down' as SiteState, stateSince: t(-3600) };
    const recent = [
      httpCheck(-30, 'up'),
      httpCheck(-150, 'up'),
      httpCheck(-270, 'down'),
    ];
    const result = deriveNextState(prev, recent);
    expect(result.state).toBe('down');
    expect(result.stateSince).toBe(t(-3600));
  });

  it('returns the input timestamp when state is unchanged', () => {
    const prev = { state: 'working' as SiteState, stateSince: t(-1000) };
    const recent = [httpCheck(-30, 'up')];
    const result = deriveNextState(prev, recent);
    expect(result.stateSince).toBe(t(-1000));
  });

  // ─── v1.3.0 layer-aware behavior ───────────────────────────────────

  const htmlCheck = (
    offset: number,
    result: 'up' | 'down' | 'degraded',
  ): CheckResult => ({
    siteId: 's',
    layer: 'headless',
    result,
    checkedAt: t(offset),
  });

  it('Working → Degraded on a failed HTML check (HTTP still up)', () => {
    const prev = { state: 'working' as SiteState, stateSince: t(-300) };
    const recent = [htmlCheck(-30, 'down'), httpCheck(-60, 'up'), httpCheck(-180, 'up')];
    const result = deriveNextState(prev, recent);
    expect(result.state).toBe('degraded');
    expect(result.stateSince).toBe(t(-30));
  });

  it('Degraded stays Degraded with 2 HTML failures + HTTP still up (no escalation to Down)', () => {
    const prev = { state: 'degraded' as SiteState, stateSince: t(-300) };
    const recent = [
      htmlCheck(-30, 'down'),
      htmlCheck(-150, 'down'),
      httpCheck(-60, 'up'),
      httpCheck(-180, 'up'),
    ];
    const result = deriveNextState(prev, recent);
    expect(result.state).toBe('degraded');
    expect(result.stateSince).toBe(t(-300));
  });

  it('Degraded → Down still triggers on 2 consecutive HTTP failures even with HTML failures interleaved', () => {
    const prev = { state: 'degraded' as SiteState, stateSince: t(-300) };
    const recent = [
      httpCheck(-30, 'down'),
      htmlCheck(-90, 'down'),
      httpCheck(-150, 'down'),
      httpCheck(-270, 'up'),
    ];
    const result = deriveNextState(prev, recent);
    expect(result.state).toBe('down');
    expect(result.stateSince).toBe(t(-150));
  });
});
