import * as cheerio from 'cheerio';
import type { CheckResult } from '@dtb/shared';

export interface HtmlCheckOptions {
  /** Hard timeout for the request in ms. Default: 15_000 (HTML responses are
   *  bigger than HEAD probes; give them more room). */
  timeoutMs?: number;
  /** CSS selectors that must be present in the rendered HTML. Missing any
   *  one of them → result === 'down' with reason 'missing_selector'. */
  mustExist?: readonly string[];
  /** CSS selectors that, if present, indicate a broken page (e.g. an error
   *  banner). Any match → result === 'down' with reason 'forbidden_selector'. */
  mustNotExist?: readonly string[];
  /** Minimum HTML body length (chars). Below this → 'empty_body'. Default: 200. */
  minBodyChars?: number;
}

/**
 * Pure async function: fetch a URL, parse the HTML, and decide whether it
 * looks like a working page. Distinct from the HTTP probe (which only cares
 * about status code) — this catches the common "200 OK but the page is
 * actually broken / empty / showing an error banner" failure mode.
 *
 * Returns `result: 'up'` when:
 *   - HTTP 2xx OR 3xx response
 *   - Content-type begins with text/html
 *   - Body is at least minBodyChars
 *   - All `mustExist` selectors find at least one match
 *   - None of `mustNotExist` selectors find any match
 *
 * Returns `result: 'down'` with a populated `failureReason` for any
 * other case. There is no `'degraded'` here — the state machine
 * interprets a down HTML check as a degraded signal.
 */
export async function checkHtml(
  url: string,
  opts: HtmlCheckOptions = {},
): Promise<Omit<CheckResult, 'siteId' | 'layer'>> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const minBodyChars = opts.minBodyChars ?? 200;
  const mustExist = opts.mustExist ?? [];
  const mustNotExist = opts.mustNotExist ?? [];

  const startedAt = Date.now();
  const controller = new AbortController();
  let timeoutFired = false;
  const timeoutPromise = new Promise<'__timeout__'>((resolve) => {
    setTimeout(() => {
      timeoutFired = true;
      controller.abort(new Error('timeout'));
      resolve('__timeout__');
    }, timeoutMs);
  });

  try {
    const fetchPromise = fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'DowntimeBhavan-HtmlCheck/0.1 (+https://downtimebhavan.in)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    // Race the real fetch against a setTimeout-based sentinel. Without the
    // sentinel, a fetch implementation that ignores AbortSignal (most test
    // mocks) would hang the whole probe past our timeoutMs.
    const raced = await Promise.race([fetchPromise, timeoutPromise]);
    if (raced === '__timeout__' || timeoutFired) {
      return {
        result: 'down',
        latencyMs: Date.now() - startedAt,
        failureReason: 'request_timeout',
        checkedAt: startedAt,
      };
    }
    const response = raced as Response;

    const latencyMs = Date.now() - startedAt;

    if (response.status < 200 || response.status >= 400) {
      return {
        result: 'down',
        httpStatus: response.status,
        latencyMs,
        failureReason: `HTTP ${response.status}`,
        checkedAt: startedAt,
      };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('html')) {
      return {
        result: 'down',
        httpStatus: response.status,
        latencyMs,
        failureReason: `non_html_content_type: ${contentType}`,
        checkedAt: startedAt,
      };
    }

    const body = await response.text();
    if (body.trim().length < minBodyChars) {
      return {
        result: 'down',
        httpStatus: response.status,
        latencyMs,
        failureReason: `empty_body (${body.trim().length} chars)`,
        checkedAt: startedAt,
      };
    }

    if (mustExist.length === 0 && mustNotExist.length === 0) {
      return {
        result: 'up',
        httpStatus: response.status,
        latencyMs,
        checkedAt: startedAt,
      };
    }

    const $ = cheerio.load(body);

    for (const selector of mustNotExist) {
      if ($(selector).length > 0) {
        return {
          result: 'down',
          httpStatus: response.status,
          latencyMs,
          failureReason: `forbidden_selector: ${selector}`,
          checkedAt: startedAt,
        };
      }
    }

    for (const selector of mustExist) {
      if ($(selector).length === 0) {
        return {
          result: 'down',
          httpStatus: response.status,
          latencyMs,
          failureReason: `missing_selector: ${selector}`,
          checkedAt: startedAt,
        };
      }
    }

    return {
      result: 'up',
      httpStatus: response.status,
      latencyMs,
      checkedAt: startedAt,
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const reason = err instanceof Error ? err.message : String(err);
    const isTimeout = reason === 'timeout' || reason.toLowerCase().includes('abort');
    return {
      result: 'down',
      latencyMs,
      failureReason: isTimeout ? 'request_timeout' : reason,
      checkedAt: startedAt,
    };
  }
}
