import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(),
    setAll: vi.fn()
  }))
}));

import { createSupabaseAdminClient } from "../../lib/supabase/admin";
import { createSupabaseServerClient } from "../../lib/supabase/server";

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn((url, key) => ({ url, key })),
  };
});

vi.mock("@supabase/ssr", () => {
  return {
    createServerClient: vi.fn((url, key) => ({ url, key })),
  };
});

describe("Supabase Admin Client URL Precedence", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should use SUPABASE_SERVER_URL when available", () => {
    process.env.SUPABASE_SERVER_URL = "http://internal-host:32002";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://public-host:32002";

    const client = createSupabaseAdminClient() as unknown as { url: string };
    expect(client.url).toBe("http://internal-host:32002");
  });

  it("should fallback to NEXT_PUBLIC_SUPABASE_URL when SUPABASE_SERVER_URL is missing", () => {
    delete process.env.SUPABASE_SERVER_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://public-host:32002";

    const client = createSupabaseAdminClient() as unknown as { url: string };
    expect(client.url).toBe("http://public-host:32002");
  });

  it("should throw error if neither is provided", () => {
    delete process.env.SUPABASE_SERVER_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    expect(() => createSupabaseAdminClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});

describe("Supabase Server Client URL Precedence", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should use SUPABASE_SERVER_URL when available", async () => {
    process.env.SUPABASE_SERVER_URL = "http://internal-host:32002";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://public-host:32002";

    const client = (await createSupabaseServerClient()) as unknown as { url: string };
    expect(client.url).toBe("http://internal-host:32002");
  });

  it("should fallback to NEXT_PUBLIC_SUPABASE_URL when SUPABASE_SERVER_URL is missing", async () => {
    delete process.env.SUPABASE_SERVER_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://public-host:32002";

    const client = (await createSupabaseServerClient()) as unknown as { url: string };
    expect(client.url).toBe("http://public-host:32002");
  });
});

