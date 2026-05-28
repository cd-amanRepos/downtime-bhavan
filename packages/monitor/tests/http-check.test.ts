import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkHttp } from '../src/http-check.js';

describe('checkHttp', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('returns up + latency + status for a 200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true }));
    const result = await checkHttp('https://example.com');
    expect(result.result).toBe('up');
    expect(result.httpStatus).toBe(200);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.failureReason).toBeUndefined();
  });

  it('returns down for a 503 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503, ok: false }));
    const result = await checkHttp('https://example.com');
    expect(result.result).toBe('down');
    expect(result.httpStatus).toBe(503);
    expect(result.failureReason).toMatch(/HTTP 503/);
  });

  it('returns down on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const result = await checkHttp('https://example.com');
    expect(result.result).toBe('down');
    expect(result.httpStatus).toBeUndefined();
    expect(result.failureReason).toMatch(/ECONNREFUSED/);
  });

  it('returns down on timeout (>10s)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(
      () => new Promise(() => { /* never resolves */ }),
    ));
    const promise = checkHttp('https://example.com', { timeoutMs: 10_000 });
    await vi.advanceTimersByTimeAsync(11_000);
    const result = await promise;
    expect(result.result).toBe('down');
    expect(result.failureReason).toMatch(/timeout/i);
  });

  it('accepts 3xx redirects as up', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 302, ok: false }));
    const result = await checkHttp('https://example.com');
    expect(result.result).toBe('up');
  });

  it('uses GET (not HEAD) to defeat servers that refuse HEAD', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, ok: true });
    vi.stubGlobal('fetch', fetchMock);
    await checkHttp('https://example.com');
    expect(fetchMock).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
      method: 'GET',
    }));
  });
});
