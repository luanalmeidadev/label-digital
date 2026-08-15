export const MIN_IMAGE_ZOOM = 100;
export const MAX_IMAGE_ZOOM = 180;

export function normalizeImageZoom(zoom: number) {
  if (!Number.isFinite(zoom)) {
    return MIN_IMAGE_ZOOM;
  }

  return Math.min(
    MAX_IMAGE_ZOOM,
    Math.max(MIN_IMAGE_ZOOM, zoom)
  );
}

export function getImageFramingStyle(
  positionX: number,
  positionY: number,
  zoom: number
) {
  const safeZoom = normalizeImageZoom(zoom);
  const scale = safeZoom / 100;
  const availableMovement = (scale - 1) * 50;
  const horizontalMovement =
    ((50 - positionX) / 50) * availableMovement;
  const verticalMovement =
    ((50 - positionY) / 50) * availableMovement;

  return {
    objectPosition: `${positionX}% ${positionY}%`,
    transform: `translate(${horizontalMovement}%, ${verticalMovement}%) scale(${scale})`,
    transformOrigin: "center",
  };
}
