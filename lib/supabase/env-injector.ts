export function generateSupabaseEnvScript(): string {
  const url = process.env['NEXT_PUBLIC_' + 'SUPABASE_URL'] || '';
  const key = process.env['NEXT_PUBLIC_' + 'SUPABASE_ANON_KEY'] || '';
  
  if (key) {
    try {
      const payload = key.split('.')[1];
      if (payload) {
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
        if (decoded.role === 'service_role') {
          return `window.__SUPABASE_ENV = { error: "security_violation_service_role" };`;
        }
      }
    } catch (e) {
      // ignore
    }
  }
  
  return `window.__SUPABASE_ENV = { url: "${url}", key: "${key}" };`;
}
