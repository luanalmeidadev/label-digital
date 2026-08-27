import { getLocalSupabaseEnvironment } from "./local-supabase-env.mjs";

export function getDemoBurgerEnvironment() {
  const { apiUrl, serviceRoleKey, anonKey } = getLocalSupabaseEnvironment();
  const environment = {
    ...process.env,
    NODE_ENV: "development",
    SITE_URL: "http://127.0.0.1:3100",
    NEXT_PUBLIC_INSTALLATION_PRESET: "demo-burger",
    NEXT_PUBLIC_SUPABASE_URL: apiUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    LOCAL_SUPABASE_URL: apiUrl,
    LOCAL_SUPABASE_ANON_KEY: anonKey,
    LOCAL_SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    PLAYWRIGHT_DEMO_BURGER: "1",
    DEMO_BURGER_ADMIN_EMAIL: "admin@brasa-burger.test",
    DEMO_BURGER_ADMIN_PASSWORD: "Brasa-Demo-2026!",
  };

  delete environment.VERCEL_ENV;
  delete environment.VERCEL_URL;
  delete environment.VERCEL_PROJECT_PRODUCTION_URL;
  return environment;
}
