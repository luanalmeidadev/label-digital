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
  return process.env['NEXT_PUBLIC_' + key];
}

export const supabase = createBrowserClient(
  getEnv('SUPABASE_URL', 'url')!,
  getEnv('SUPABASE_ANON_KEY', 'key')!
);