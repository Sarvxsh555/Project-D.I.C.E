/** Hackathon tracing: every hop uses X-Request-ID (req_*). Wire OpenTelemetry SDK later. */
export function traceHeaders(requestId: string): Record<string, string> {
  return { 'x-request-id': requestId };
}
