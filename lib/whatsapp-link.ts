export function buildWhatsAppParams(
  phone: string,
  message: string
) {
  return new URLSearchParams({
    phone,
    text: message,
  }).toString();
}

export function buildWhatsAppAppUrl(
  phone: string,
  message: string
) {
  return `whatsapp://send?${buildWhatsAppParams(phone, message)}`;
}

export function buildWhatsAppWebUrl(
  phone: string,
  message: string
) {
  return `https://web.whatsapp.com/send?${buildWhatsAppParams(phone, message)}`;
}

export function buildWhatsAppShortUrl(
  phone: string,
  message: string
) {
  const params = new URLSearchParams({
    text: message,
  }).toString();

  return `https://wa.me/${phone}?${params}`;
}
