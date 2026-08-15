export function normalizeInstagramHandle(
  value: string | null | undefined
) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const withoutUrl = trimmed
    .replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    ?.trim();

  if (!withoutUrl) {
    return null;
  }

  return `@${withoutUrl}`;
}

export function buildInstagramUrl(
  value: string | null | undefined
) {
  const handle = normalizeInstagramHandle(value);

  return handle
    ? `https://www.instagram.com/${handle.slice(1)}/`
    : null;
}
