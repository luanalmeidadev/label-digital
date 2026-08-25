import "server-only";

export type ValidatedImage = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export async function validateImageUpload(
  image: File
): Promise<ValidatedImage> {
  if (image.size <= 0 || image.size > MAX_IMAGE_SIZE) {
    throw new Error("A imagem deve ter no m\u00e1ximo 5 MB.");
  }

  const bytes = new Uint8Array(
    await image.slice(0, 12).arrayBuffer()
  );

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  if (
    startsWith(bytes, [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ])
  ) {
    return { contentType: "image/png", extension: "png" };
  }

  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }

  throw new Error(
    "Formato de imagem inv\u00e1lido. Use um arquivo JPG, PNG ou WebP verdadeiro."
  );
}
