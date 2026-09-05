import { Agent, request as undiciRequest } from 'undici';

/** 2s connect, 10s request — never retry POSTs at this layer. */
export const dispatcher = new Agent({
  connectTimeout: 2_000,
  headersTimeout: 10_000,
  bodyTimeout: 10_000,
  keepAliveTimeout: 10_000,
});

export async function upstreamRequest(
  url: string,
  opts: {
    method: string;
    headers: Record<string, string>;
    body?: Buffer | string | null;
  }
) {
  return undiciRequest(url, {
    dispatcher,
    method: opts.method as 'GET',
    headers: opts.headers,
    body: opts.body ?? undefined,
  });
}
