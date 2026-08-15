import "server-only";

import {
  getPreorderStorageClient,
  preorderStorageBucket,
} from "@/lib/preorder-catalog-store";
import { normalizeImageZoom } from "@/lib/image-framing";

export type PreorderHeroImageSettings = {
  image: string;
  positionX: number;
  positionY: number;
  zoom: number;
};

export type ImageDisplaySettings = {
  preorderHero: PreorderHeroImageSettings;
  dailyProductZoom: Record<string, number>;
};

const settingsPath = "image-display-settings.json";

const defaultSettings: ImageDisplaySettings = {
  preorderHero: {
    image: "/encomendas/bolo-espatulado.jpeg",
    positionX: 50,
    positionY: 65,
    zoom: 100,
  },
  dailyProductZoom: {},
};

function validPercentage(value: unknown) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function validZoom(value: unknown) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 50 &&
    value <= 180
  );
}

function parseSettings(
  value: unknown
): ImageDisplaySettings {
  if (!value || typeof value !== "object") {
    return structuredClone(defaultSettings);
  }

  const settings = value as Partial<ImageDisplaySettings>;
  const hero = settings.preorderHero;
  const dailyProductZoom: Record<string, number> = {};

  if (
    settings.dailyProductZoom &&
    typeof settings.dailyProductZoom === "object"
  ) {
    for (const [id, zoom] of Object.entries(
      settings.dailyProductZoom
    )) {
      if (id.length > 0 && validZoom(zoom)) {
        dailyProductZoom[id] = normalizeImageZoom(
          zoom as number
        );
      }
    }
  }

  const validHero =
    hero &&
    typeof hero.image === "string" &&
    hero.image.length > 0 &&
    validPercentage(hero.positionX) &&
    validPercentage(hero.positionY) &&
    validZoom(hero.zoom);

  return {
    preorderHero: validHero && hero
      ? {
          image: hero.image as string,
          positionX: hero.positionX as number,
          positionY: hero.positionY as number,
          zoom: normalizeImageZoom(hero.zoom as number),
        }
      : structuredClone(defaultSettings.preorderHero),
    dailyProductZoom,
  };
}

export async function getImageDisplaySettings() {
  const supabase =
    await getPreorderStorageClient();
  const { data, error } = await supabase.storage
    .from(preorderStorageBucket)
    .download(settingsPath);

  if (error) {
    return structuredClone(defaultSettings);
  }

  try {
    return parseSettings(JSON.parse(await data.text()));
  } catch {
    return structuredClone(defaultSettings);
  }
}

export async function saveImageDisplaySettings(
  settings: ImageDisplaySettings
) {
  const supabase =
    await getPreorderStorageClient();
  const body = new Blob(
    [JSON.stringify(settings, null, 2)],
    { type: "application/json" }
  );
  const { error } = await supabase.storage
    .from(preorderStorageBucket)
    .upload(settingsPath, body, {
      contentType: "application/json",
      cacheControl: "0",
      upsert: true,
    });

  if (error) {
    throw new Error(
      "Não foi possível salvar os ajustes das imagens."
    );
  }
}

export async function setDailyProductZoom(
  productId: string,
  zoom: number
) {
  const settings = await getImageDisplaySettings();
  settings.dailyProductZoom[productId] = zoom;
  await saveImageDisplaySettings(settings);
}

export async function removeDailyProductZoom(
  productId: string
) {
  const settings = await getImageDisplaySettings();
  delete settings.dailyProductZoom[productId];
  await saveImageDisplaySettings(settings);
}
