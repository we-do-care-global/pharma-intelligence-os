import { describe, expect, it, vi, afterEach } from 'vitest';
import { api } from '../src/lib/appdeploy-client';

/**
 * Covers the in-repo `@appdeploy/client` shim that CI, local builds and GitHub
 * Pages resolve instead of the unpublished platform package. The behaviours that
 * actually broke the app before are: a non-2xx response must reject (so the UI
 * shows its safe fallback instead of rendering `undefined`), and a JSON body must
 * arrive parsed on `data`.
 */

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(response.json ? await response.json() : {}),
    ...response,
  });
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('api shim', () => {
  it('parses a JSON body onto data for GET', async () => {
    mockFetch({ json: async () => ({ cases: [{ id: 'ICSR-00041' }] }) });

    const res = await api.get<{ cases: Array<{ id: string }> }>('/api/dashboard');

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.cases[0].id).toBe('ICSR-00041');
  });

  it('sends the body as JSON on POST', async () => {
    const fn = mockFetch({ json: async () => ({ ok: true }) });

    await api.post('/api/cases/verify', { id: 'ICSR-00042' });

    const [, init] = fn.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'content-type': 'application/json' });
    expect(JSON.parse(String(init.body))).toEqual({ id: 'ICSR-00042' });
  });

  it('rejects on a non-2xx response so the UI falls back safely', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => JSON.stringify({ message: 'Approval source unavailable' }),
    }) as unknown as typeof fetch;

    await expect(api.get('/api/approvals')).rejects.toThrow('Approval source unavailable');
  });

  it('tolerates an empty response body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => '',
    }) as unknown as typeof fetch;

    const res = await api.post('/api/refresh');
    expect(res.data).toBeNull();
  });
});
