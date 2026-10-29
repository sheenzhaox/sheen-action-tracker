import { Hono } from "hono";
import type { ApiError, HealthResponse } from "@action-tracker/shared";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.get("/health", (c) => c.json<HealthResponse>({ ok: true, service: "action-tracker", apiVersion: 1 }));

// Every other /api route requires a Cloudflare Access JWT (iss + sub). Validation lands with cloud sync (P3);
// until then they fail closed.
app.all("*", (c) => c.json<ApiError>({ error: "unauthorized" }, 401));

export default app satisfies ExportedHandler<Env>;
