export type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

export type GatewayErrorBody = {
  success: false;
  message: string;
  error: {
    code: string;
    message: string;
    service: string;
    requestId: string;
  };
};
