export const installationPresetIds = Object.freeze([
  "label",
  "demo-burger",
]);

export const labelInstallationModules = Object.freeze({
  preorders: true,
  preorderSchedule: true,
  delivery: true,
  pickup: true,
  cashRegister: true,
  financial: true,
  reports: true,
  tracking: true,
  advancedUsers: true,
  adminAudit: true,
});

export const demoBurgerInstallationModules = Object.freeze({
  preorders: false,
  preorderSchedule: false,
  delivery: true,
  pickup: true,
  cashRegister: true,
  financial: true,
  reports: true,
  tracking: true,
  advancedUsers: true,
  adminAudit: true,
});

const installationModulesByPreset = Object.freeze({
  label: labelInstallationModules,
  "demo-burger": demoBurgerInstallationModules,
});

/**
 * @param {{ requestedPreset?: string | null, nodeEnv?: string, allowDemoPreset?: boolean }} [options]
 */
export function resolveInstallationModuleFlags({
  requestedPreset,
  nodeEnv = process.env.NODE_ENV,
  allowDemoPreset = false,
} = {}) {
  const presetId = requestedPreset?.trim() || "label";

  if (!installationPresetIds.includes(presetId)) {
    throw new Error(`Installation preset desconhecido: ${presetId}.`);
  }

  if (
    nodeEnv === "production" &&
    presetId !== "label" &&
    !allowDemoPreset
  ) {
    throw new Error(
      "Presets de demonstração não podem ser selecionados em produção."
    );
  }

  return installationModulesByPreset[presetId];
}
