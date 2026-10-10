import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";
import { AppError } from "./errors";

/** Validates req.body against a Zod schema. Returns field-level errors on failure. */
export function validate(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "_";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return next(new AppError(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", fieldErrors));
    }
    req.body = parsed.data;
    next();
  };
}

/** Validates req.query. */
export function validateQuery(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".") || "_"] = issue.message;
      return next(new AppError(400, "VALIDATION_ERROR", "Invalid query.", fieldErrors));
    }
    (req as Request & { validatedQuery?: unknown }).validatedQuery = parsed.data;
    next();
  };
}
