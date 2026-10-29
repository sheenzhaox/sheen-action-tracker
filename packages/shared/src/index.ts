import { z } from "zod";

export const HealthResponse = z.object({
  ok: z.literal(true),
  service: z.literal("action-tracker"),
  apiVersion: z.literal(1),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

export const ApiError = z.object({
  error: z.enum(["unauthorized", "not_found", "quota_exceeded", "conflict", "bad_request"]),
});
export type ApiError = z.infer<typeof ApiError>;
