import { getLocalSupabaseEnvironment } from "./local-supabase-env.mjs";

export function getDemoPizzariaEnvironment() {
  const { apiUrl, serviceRoleKey, anonKey } = getLocalSupabaseEnvironment();
  const environment = {
    ...process.env,
    NODE_ENV: "development",
    SITE_URL: "http://127.0.0.1:3100",
    NEXT_PUBLIC_INSTALLATION_PRESET: "demo-pizzaria",
    NEXT_PUBLIC_SUPABASE_URL: apiUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    LOCAL_SUPABASE_URL: apiUrl,
    LOCAL_SUPABASE_ANON_KEY: anonKey,
    LOCAL_SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    PLAYWRIGHT_DEMO_PIZZARIA: "1",
    DEMO_PIZZARIA_ADMIN_EMAIL: "admin@pizzaria.test",
    DEMO_PIZZARIA_ADMIN_PASSWORD: "Pizza-Demo-2026!",
  };

  delete environment.VERCEL_ENV;
  delete environment.VERCEL_URL;
  delete environment.VERCEL_PROJECT_PRODUCTION_URL;
  return environment;
}
