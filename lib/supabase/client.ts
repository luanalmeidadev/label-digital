import { createBrowserClient } from "@supabase/ssr";

interface WindowWithEnv extends Window {
  __SUPABASE_ENV?: {
    url?: string;
    key?: string;
  };
}

function getEnv(key: string, field: 'url' | 'key') {
  if (typeof window !== 'undefined') {
    const env = (window as unknown as WindowWithEnv).__SUPABASE_ENV;
    const val = env?.[field];
    if (val && val !== 'undefined') return val;
  }
  
  // Fallback to process.env (server-side)
  const envVarName = 'NEXT_PUBLIC_' + key;
  const val = process.env[envVarName];
  if (val === 'mock-url-for-build.local' || val === 'mock-anon-key-for-build') {
    // We are in runtime but __SUPABASE_ENV wasn't set or we are on the server without real env vars.
    // If this is the browser, this means the build-time mock was inlined and __SUPABASE_ENV is missing!
    if (typeof window !== 'undefined') {
      console.error(`ERROR: Supabase client is trying to use build-time mock ${val}. __SUPABASE_ENV is missing.`);
      // We throw to fail fast in tests/runtime if mocks are still used
      throw new Error(`Invalid runtime config: cannot use build-time mock ${val}`);
    }
    // On the server, returning the mock might be expected during `next build`, so we allow it there.
  }
  return val;
}

export const supabase = createBrowserClient(
  getEnv('SUPABASE_URL', 'url')!,
  getEnv('SUPABASE_ANON_KEY', 'key')!
);