import { expect, test, describe, afterEach, vi } from 'vitest';

// Mock next/headers since it throws outside a Next.js request scope
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

import { generateSupabaseEnvScript } from '../../lib/supabase/env-injector';

describe('Supabase Env Injector Security', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  test('Should block service_role key from being injected', () => {
    const payload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
    const fakeKey = `header.${payload}.signature`;
    
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = fakeKey;
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'http://localhost';

    const script = generateSupabaseEnvScript();
    
    expect(script).toContain('error: "security_violation_service_role"');
    expect(script).not.toContain(fakeKey);
  });

  test('Should allow anon key to be injected', () => {
    const payload = Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url');
    const fakeKey = `header.${payload}.signature`;
    
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = fakeKey;
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'http://localhost';

    const script = generateSupabaseEnvScript();
    
    expect(script).not.toContain('error: "security_violation_service_role"');
    expect(script).toContain(fakeKey);
  });
});
