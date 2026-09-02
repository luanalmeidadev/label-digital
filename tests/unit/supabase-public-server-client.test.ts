import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock "server-only" module since it throws outside a server context
vi.mock("server-only", () => ({}));

// Mock the @supabase/supabase-js createClient
const mockCreateClient = vi.fn().mockReturnValue({ from: vi.fn() });
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

describe("createSupabasePublicServerClient", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreateClient.mockClear();
    // Set required env vars
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg4MzYxMzY0LCJleHAiOjIxMDM3MjEzNjR9.fake";
    delete process.env.SUPABASE_SERVER_URL;
  });

  it("uses anon key, not service_role", async () => {
    const { createSupabasePublicServerClient } = await import(
      "@/lib/supabase/public-server"
    );
    createSupabasePublicServerClient();

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    const [, key] = mockCreateClient.mock.calls[0];
    expect(key).toBe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    expect(key).not.toBe(process.env.SUPABASE_SERVICE_ROLE_KEY);
  });

  it("does not use cookies", async () => {
    const { createSupabasePublicServerClient } = await import(
      "@/lib/supabase/public-server"
    );
    createSupabasePublicServerClient();

    const [, , options] = mockCreateClient.mock.calls[0];
    // No cookies config should be present
    expect(options).not.toHaveProperty("cookies");
    expect(options.auth.persistSession).toBe(false);
    expect(options.auth.autoRefreshToken).toBe(false);
  });

  it("prefers SUPABASE_SERVER_URL when available", async () => {
    process.env.SUPABASE_SERVER_URL = "http://internal:54321";
    const { createSupabasePublicServerClient } = await import(
      "@/lib/supabase/public-server"
    );
    createSupabasePublicServerClient();

    const [url] = mockCreateClient.mock.calls[0];
    expect(url).toBe("http://internal:54321");
  });

  it("falls back to NEXT_PUBLIC_SUPABASE_URL", async () => {
    delete process.env.SUPABASE_SERVER_URL;
    const { createSupabasePublicServerClient } = await import(
      "@/lib/supabase/public-server"
    );
    createSupabasePublicServerClient();

    const [url] = mockCreateClient.mock.calls[0];
    expect(url).toBe("http://localhost:54321");
  });

  it("throws if URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVER_URL;
    const { createSupabasePublicServerClient } = await import(
      "@/lib/supabase/public-server"
    );

    expect(() => createSupabasePublicServerClient()).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL"
    );
  });

  it("throws if anon key is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { createSupabasePublicServerClient } = await import(
      "@/lib/supabase/public-server"
    );

    expect(() => createSupabasePublicServerClient()).toThrow(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  });
});
