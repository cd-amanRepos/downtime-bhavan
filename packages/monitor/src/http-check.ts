import type { CheckResult } from '@dtb/shared';

export interface HttpCheckOptions {
  /** Hard timeout for the request in milliseconds. Default: 10_000. */
  timeoutMs?: number;
}

/**
 * Probe a URL with a GET request and classify the outcome.
 *
 * Status codes 2xx and 3xx → 'up'. Anything else → 'down'.
 * Network errors and timeouts → 'down' with a descriptive `failureReason`.
 *
 * This is a pure function: no DB, no logging. Caller persists the result.
 */
export async function checkHttp(
  url: string,
  opts: HttpCheckOptions = {},
): Promise<Omit<CheckResult, 'siteId' | 'layer'>> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const startedAt = Date.now();
  const controller = new AbortController();

  // A timeout promise that resolves (not rejects) with a sentinel after timeoutMs.
  // Using setTimeout so vitest's fake timers can advance it in tests.
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<'__timeout__'>((resolve) => {
    timer = setTimeout(() => {
      controller.abort(new Error('timeout'));
      resolve('__timeout__');
    }, timeoutMs);
  });

  try {
    const fetchPromise = fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'DowntimeBhavan/0.1 (+https://downtimebhavan.in)',
      },
    });

    const raced = await Promise.race([fetchPromise, timeoutPromise]);

    if (raced === '__timeout__') {
      const latencyMs = Date.now() - startedAt;
      return {
        result: 'down',
        latencyMs,
        failureReason: 'request timeout',
        checkedAt: startedAt,
      };
    }

    const response = raced;
    const latencyMs = Date.now() - startedAt;
    const ok = response.status >= 200 && response.status < 400;

    return {
      result: ok ? 'up' : 'down',
      httpStatus: response.status,
      latencyMs,
      failureReason: ok ? undefined : `HTTP ${response.status}`,
      checkedAt: startedAt,
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const reason = err instanceof Error ? err.message : String(err);
    const isTimeout = reason === 'timeout' || reason.toLowerCase().includes('abort');
    return {
      result: 'down',
      latencyMs,
      failureReason: isTimeout ? 'request timeout' : reason,
      checkedAt: startedAt,
    };
  } finally {
    clearTimeout(timer!);
  }
}
