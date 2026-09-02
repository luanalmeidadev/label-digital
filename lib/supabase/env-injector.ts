import { headers } from 'next/headers';

export function generateSupabaseEnvScript(): string {
  // Call headers() to opt out of static generation. This ensures the environment
  // variables are read at runtime for every request, preventing build-time mocks from being baked in.
  headers();

  // Use opaque reference to process.env to bypass Next.js build-time inlining
  // of NEXT_PUBLIC_* variables.
  const getEnv = (name: string) => {
    const envObj = process['env'];
    return envObj[name] || '';
  };

  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  if (key) {
    try {
      const payload = key.split('.')[1];
      if (payload) {
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
        if (decoded.role === 'service_role') {
          return `window.__SUPABASE_ENV = { error: "security_violation_service_role" };`;
        }
      }
    } catch {
      // ignore
    }
  }
  
  return `window.__SUPABASE_ENV = { url: "${url}", key: "${key}" };`;
}
