import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkHtml } from '../src/html-check.js';

function htmlResponse(body: string, status = 200, contentType = 'text/html; charset=utf-8') {
  return {
    status,
    ok: status >= 200 && status < 400,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => body,
  } as unknown as Response;
}

describe('checkHtml', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('returns up for a 200 HTML response with sufficient body and no selector rules', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse('<html><body>' + 'a'.repeat(300) + '</body></html>')));
    const result = await checkHtml('https://example.com');
    expect(result.result).toBe('up');
    expect(result.httpStatus).toBe(200);
  });

  it('returns down on 5xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse('<html/>', 503)));
    const result = await checkHtml('https://example.com');
    expect(result.result).toBe('down');
    expect(result.failureReason).toMatch(/HTTP 503/);
  });

  it('returns down for non-HTML content type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse('{}', 200, 'application/json')));
    const result = await checkHtml('https://example.com');
    expect(result.result).toBe('down');
    expect(result.failureReason).toMatch(/non_html_content_type/);
  });

  it('returns down for empty body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse('<html></html>')));
    const result = await checkHtml('https://example.com');
    expect(result.result).toBe('down');
    expect(result.failureReason).toMatch(/empty_body/);
  });

  it('returns down if mustExist selector is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse('<html><body>' + 'a'.repeat(300) + '</body></html>')));
    const result = await checkHtml('https://example.com', { mustExist: ['form#login'] });
    expect(result.result).toBe('down');
    expect(result.failureReason).toMatch(/missing_selector/);
  });

  it('returns up if mustExist selector is present', async () => {
    const body = '<html><body><form id="login"></form>' + 'a'.repeat(300) + '</body></html>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse(body)));
    const result = await checkHtml('https://example.com', { mustExist: ['form#login'] });
    expect(result.result).toBe('up');
  });

  it('returns down if mustNotExist selector is present', async () => {
    const body = '<html><body><div class="error">Service unavailable</div>' + 'a'.repeat(300) + '</body></html>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse(body)));
    const result = await checkHtml('https://example.com', { mustNotExist: ['div.error'] });
    expect(result.result).toBe('down');
    expect(result.failureReason).toMatch(/forbidden_selector/);
  });

  it('returns down on timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(() => { /* never */ })));
    const promise = checkHtml('https://example.com', { timeoutMs: 5_000 });
    await vi.advanceTimersByTimeAsync(6_000);
    const result = await promise;
    expect(result.result).toBe('down');
    expect(result.failureReason).toMatch(/timeout|abort/i);
  });

  it('returns down on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const result = await checkHtml('https://example.com');
    expect(result.result).toBe('down');
    expect(result.failureReason).toMatch(/ECONNREFUSED/);
  });
});
