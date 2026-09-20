import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/health/route";
import * as Sentry from "@sentry/nextjs";

// Mocks
vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/config/installation/modules", () => ({
  getHealthCheckKeys: vi.fn(() => ["database", "preorderStorage"]),
}));

vi.mock("@/lib/preorder-catalog-store", () => ({
  preorderStorageBucket: "mock-preorder-bucket",
}));

const mockSelect = vi.fn();
const mockLimit = vi.fn();
const mockFrom = vi.fn();
const mockList = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        limit: mockLimit,
      }),
    }),
    storage: {
      from: mockStorageFrom.mockReturnValue({
        list: mockList,
      }),
    },
  }),
}));

describe("GET /api/health", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.PLATFORM_HEALTH_SECRET = "test-secret";
    process.env.CORE_VERSION = "1.0.0";

    mockLimit.mockResolvedValue({ data: [{ id: 1 }], error: null });
    mockList.mockResolvedValue({ data: [{ name: "test" }], error: null });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createReq(authHeader?: string) {
    const headers = new Headers();
    if (authHeader) headers.set("Authorization", authHeader);
    return new NextRequest("http://localhost/api/health", { headers });
  }

  it("fail closed if PLATFORM_HEALTH_SECRET is missing", async () => {
    delete process.env.PLATFORM_HEALTH_SECRET;
    const res = await GET(createReq("Bearer test-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 401 if Authorization header is missing", async () => {
    const res = await GET(createReq());
    expect(res.status).toBe(401);
  });

  it("returns 401 if Authorization header is invalid", async () => {
    const res = await GET(createReq("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 401 if token length mismatch (timing safe bypass)", async () => {
    const res = await GET(createReq("Bearer short"));
    expect(res.status).toBe(401);
  });

  it("returns 200 ok when all checks pass", async () => {
    const res = await GET(createReq("Bearer test-secret"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      status: "ok",
      coreVersion: "1.0.0",
      checks: {
        database: "ok",
        preorderStorage: "ok",
      },
    });
  });

  it("returns unknown coreVersion if CORE_VERSION is missing", async () => {
    delete process.env.CORE_VERSION;
    const res = await GET(createReq("Bearer test-secret"));
    const json = await res.json();
    expect(json.coreVersion).toBe("unknown");
  });

  it("returns 503 degraded if database fails", async () => {
    mockLimit.mockResolvedValueOnce({ error: new Error("DB Error") });

    const res = await GET(createReq("Bearer test-secret"));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json).toEqual({
      status: "degraded",
      coreVersion: "1.0.0",
      checks: {
        database: "failed",
        preorderStorage: "ok",
      },
    });
    expect(Sentry.captureMessage).toHaveBeenCalled();
  });

  it("returns 503 degraded if storage fails", async () => {
    mockList.mockResolvedValueOnce({ error: new Error("Storage Error") });

    const res = await GET(createReq("Bearer test-secret"));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.checks.preorderStorage).toBe("failed");
    expect(json.checks.database).toBe("ok");
  });

  it("treats timeout as degraded", async () => {
    vi.useFakeTimers();
    mockLimit.mockReturnValue(new Promise(() => {})); // Never resolves

    const promise = GET(createReq("Bearer test-secret"));

    // Fast-forward time
    vi.advanceTimersByTime(3500);

    const res = await promise;
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.checks.database).toBe("failed");

    vi.useRealTimers();
  });

  it("never leaks internal error messages, PLATFORM_HEALTH_SECRET, or SUPABASE_SERVICE_ROLE_KEY", async () => {
    const internalMsg = "Internal Supabase Error Connection Failed";
    mockLimit.mockResolvedValueOnce({ error: new Error(internalMsg) });

    // Add fake service role key to env to ensure it doesn't leak
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";

    const res = await GET(createReq("Bearer test-secret"));
    expect(res.status).toBe(503);
    const responseText = await res.text();

    expect(responseText).not.toContain(internalMsg);
    expect(responseText).not.toContain("test-secret");
    expect(responseText).not.toContain("fake-service-role-key");

    // Ensure it's still a valid JSON and matches the contract
    const json = JSON.parse(responseText);
    expect(json.status).toBe("degraded");
  });
});
