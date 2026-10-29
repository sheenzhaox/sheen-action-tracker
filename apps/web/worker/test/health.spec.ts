import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { ApiError, HealthResponse } from "@action-tracker/shared";

describe("worker /api", () => {
  it("serves a public health check", async () => {
    const res = await exports.default.fetch("http://example.com/api/health");
    expect(res.status).toBe(200);
    expect(HealthResponse.parse(await res.json())).toEqual({ ok: true, service: "action-tracker", apiVersion: 1 });
  });

  it("fails closed on other /api routes until Access JWT validation exists", async () => {
    for (const path of ["/api/analyses", "/api/uploads/x", "/api/healthz"]) {
      const res = await exports.default.fetch(`http://example.com${path}`, { method: "POST" });
      expect(res.status, path).toBe(401);
      expect(ApiError.parse(await res.json()).error).toBe("unauthorized");
    }
  });
});
