export const INSTALLATION_PROFILE_SCHEMA_VERSION = 3 as const;

export const installationModuleKeys = [
  "preorders",
  "preorderSchedule",
  "delivery",
  "pickup",
  "cashRegister",
  "financial",
  "reports",
  "tracking",
  "advancedUsers",
  "adminAudit",
] as const;

export type InstallationModuleKey =
  (typeof installationModuleKeys)[number];

export type InstallationModules = Record<
  InstallationModuleKey,
  boolean
>;

export const foodBusinessSegments = [
  "confectionery",
  "hamburger",
  "snack-bar",
  "meal-prep",
  "pizzeria",
  "restaurant",
  "cafe",
  "acai-ice-cream",
  "other",
] as const;

export type FoodBusinessSegment =
  (typeof foodBusinessSegments)[number];

export const schemaOrgTypes = [
  "Bakery",
  "Restaurant",
  "FastFoodRestaurant",
  "CafeOrCoffeeShop",
  "FoodEstablishment",
] as const;

export type SchemaOrgType = (typeof schemaOrgTypes)[number];

export type InstallationProfile = {
  readonly schemaVersion: typeof INSTALLATION_PROFILE_SCHEMA_VERSION;
  readonly preset: {
    readonly id: string;
    readonly version: number;
  };
  readonly identity: {
    readonly name: string;
    readonly shortName: string;
    readonly slug: string;
    readonly businessSegment: FoodBusinessSegment;
    readonly slogan: string | null;
    readonly assets: {
      readonly logos: {
        readonly default: string;
        readonly onPrimary: string;
      };
      readonly icon: string;
      readonly brandIcons: {
        readonly default: string;
        readonly onPrimary: string;
      };
      readonly monograms: {
        readonly default: string;
        readonly onPrimary: string;
      };
    };
  };
  readonly theme: {
    readonly primary: string;
    readonly onPrimary: string;
    readonly primaryHover: string;
    readonly accent: string;
    readonly background: string;
    readonly surface: string;
    readonly mutedSurface: string;
    readonly text: string;
    readonly mutedText: string;
    readonly border: string;
  };
  readonly contact: {
    readonly whatsapp: string;
    readonly instagram: string | null;
    readonly email: string | null;
    readonly phone: string | null;
  };
  readonly address: {
    readonly street: string;
    readonly number: string;
    readonly complement: string | null;
    readonly neighborhood: string | null;
    readonly city: string;
    readonly state: string;
    readonly postalCode: string | null;
    readonly country: string;
  };
  readonly regionalization: {
    readonly locale: string;
    readonly currency: string;
    readonly timeZone: string;
  };
  readonly seo: {
    readonly title: string;
    readonly titleTemplate: string;
    readonly description: string;
    readonly keywords: readonly string[];
    readonly siteName: string;
    readonly schemaOrgType: SchemaOrgType;
    readonly manifestDescription: string;
    readonly openGraph: {
      readonly type: "website";
      readonly locale: string;
      readonly title: string;
      readonly description: string;
      readonly image: {
        readonly alt: string;
        readonly eyebrow: string;
        readonly description: string;
        readonly footerItems: readonly string[];
      };
    };
    readonly twitter: {
      readonly card: "summary" | "summary_large_image";
      readonly title: string;
      readonly description: string;
    };
  };
  readonly publicContent: {
    readonly hero: {
      readonly eyebrow: string;
      readonly title: string;
      readonly description: string;
      readonly primaryCta: {
        readonly label: string;
        readonly href: string;
      } | null;
    };
    readonly fulfillment: {
      readonly pickupAndDelivery: {
        readonly title: string;
        readonly description: string;
      };
      readonly pickupOnly: {
        readonly title: string;
        readonly description: string;
      };
      readonly deliveryOnly: {
        readonly title: string;
        readonly description: string;
      };
      readonly unavailable: {
        readonly title: string;
        readonly description: string;
      };
    };
    readonly preorders: {
      readonly banner: {
        readonly eyebrow: string;
        readonly title: string;
        readonly description: string;
        readonly ctaLabel: string;
      };
      readonly categoryShortcut: {
        readonly eyebrow: string;
        readonly title: string;
        readonly description: string;
      };
    };
  };
  readonly legal: {
    readonly controllerName: string;
    readonly contactChannel: "whatsapp";
    readonly locality: {
      readonly city: string;
      readonly state: string;
      readonly country: string;
    };
    readonly privacyNoticePath: string;
    readonly privacyNoticeLastUpdated: string;
  };
  readonly modules: InstallationModules;
};

export type PublicInstallationProfile = InstallationProfile;
