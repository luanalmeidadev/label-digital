import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn((url, key) => ({ url, key })),
}));

describe("Supabase Browser Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    if (typeof window !== "undefined") {
      // @ts-expect-error - simulating teardown
      delete window.__SUPABASE_ENV;
    }
  });

  it("should throw if trying to use build-time mock without window.__SUPABASE_ENV", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "mock-url-for-build.local";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key-for-build";

    // Set a dummy window to simulate browser environment where mocks are statically injected
    global.window = {} as unknown as Window & typeof globalThis;

    await expect(async () => {
      await import("../../lib/supabase/client");
    }).rejects.toThrow(/mock-url-for-build.local/);
    
    // @ts-expect-error - simulating teardown
    delete global.window;
  });

  it("should use window.__SUPABASE_ENV if available", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "mock-url-for-build.local";
    
    // Set a dummy window with the runtime environment
    global.window = {
      __SUPABASE_ENV: {
        url: "http://real-runtime.local",
        key: "real-runtime-key"
      }
    } as unknown as Window & typeof globalThis;

    const { supabase } = await import("../../lib/supabase/client");
    expect((supabase as unknown as { url: string }).url).toBe("http://real-runtime.local");
    expect((supabase as unknown as { key: string }).key).toBe("real-runtime-key");

    // @ts-expect-error - simulating teardown
    delete global.window;
  });
});
