/**
 * The three possible states for a tracked site.
 *
 * `working` — All checks pass.
 * `degraded` — HTTP up but a layer-2 check is failing OR the community has
 *   flagged the site (≥20 grievances in 10 minutes).
 * `down` — HTTP layer is failing (server unreachable, 5xx, or timeout).
 */
export type SiteState = 'working' | 'degraded' | 'down';

/** Which detection layer produced a given check result. */
export type CheckLayer = 'http' | 'headless';

/** A single probe outcome — what the monitor writes per attempt. */
export interface CheckResult {
  siteId: string;
  layer: CheckLayer;
  /** 'up' | 'degraded' | 'down' — the layer's verdict, not necessarily the
   *  site's overall state (which is derived by the state machine). */
  result: 'up' | 'degraded' | 'down';
  httpStatus?: number;
  latencyMs?: number;
  /** Human-readable reason when result !== 'up'. */
  failureReason?: string;
  checkedAt: number; // unix epoch ms
}

/** A site config file (config/sites/*.json) — what gets seeded into DB. */
export interface SiteConfig {
  id: string;
  name: string;
  url: string;
  selectors?: {
    /** Selectors that must be present in the rendered page (layer-2). */
    mustExist?: string[];
    /** Selectors that, if present, indicate a broken page (layer-2). */
    mustNotExist?: string[];
  };
  /** Region label used in the UI ("Mumbai"). */
  checkpointRegion?: string;
  headlessTimeoutMs?: number;
  enabled?: boolean; // default true
}

/** Denormalized current state per site — what the homepage reads from. */
export interface SiteStatusSnapshot {
  siteId: string;
  name: string;
  url: string;
  currentState: SiteState;
  /** Epoch ms when the site entered `currentState`. */
  stateSince: number;
  uptime30dPct: number | null; // null until 30d of data is available
  lastCheckAt: number;
  communityFlag: boolean;
  /** Last 24 hourly buckets (oldest → newest). One entry per hour. */
  last24h: Array<{ hourStart: number; state: SiteState | 'unknown' }>;
}
