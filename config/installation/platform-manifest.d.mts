export const PLATFORM_DEMO_MANIFEST_SCHEMA_VERSION: 1;

export type PlatformDemoManifest = Readonly<{
  schemaVersion: typeof PLATFORM_DEMO_MANIFEST_SCHEMA_VERSION;
  generatedAt: string;
  expiresAt?: string;
  business: Readonly<{
    name: string;
    slug: string;
    segment: "hamburgueria";
    preset: "demo-burger";
  }>;
  theme: Readonly<{
    primary: string;
    secondary: string;
  }>;
  contact: Readonly<{
    whatsapp?: string;
    email?: string;
    instagram?: string;
  }>;
  location: Readonly<{
    address?: string;
    city?: string;
    state?: string;
  }>;
}>;

export type PlatformDemoManifestParseOptions = Readonly<{
  now?: Date | number | string;
}>;

export class PlatformDemoManifestError extends Error {}

export function parsePlatformDemoManifest(
  input: unknown,
  options?: PlatformDemoManifestParseOptions
): PlatformDemoManifest;

export function parsePlatformDemoManifestJson(
  serialized: string,
  options?: PlatformDemoManifestParseOptions
): PlatformDemoManifest;

