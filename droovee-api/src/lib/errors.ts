import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 429 | 500,
    public code: ErrorCode,
    message: string,
    public fieldErrors?: Record<string, string>,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Standard error envelope: { code, message, fieldErrors?, requestId }. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();
  if (err instanceof AppError) {
    return res.status(err.status).json({
      code: err.code,
      message: err.message,
      fieldErrors: err.fieldErrors,
      details: err.details,
      requestId,
    });
  }
  // Never leak internals to clients; log structured info only.
  console.error(JSON.stringify({ level: "error", requestId, msg: (err as Error)?.message }));
  return res.status(500).json({ code: "INTERNAL", message: "Something went wrong.", requestId });
}
