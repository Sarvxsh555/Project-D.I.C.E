export class GatewayError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public service = 'gateway'
  ) {
    super(message);
  }
}

export function mapUpstreamStatus(status: number): string {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'UPSTREAM_ERROR';
  if (status >= 400) return 'BAD_REQUEST';
  return 'OK';
}
