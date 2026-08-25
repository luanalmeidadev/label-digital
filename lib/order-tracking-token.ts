import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function getTrackingSecret() {
  const secret =
    process.env.ORDER_TRACKING_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!secret) {
    throw new Error("A prote\u00e7\u00e3o do acompanhamento n\u00e3o est\u00e1 configurada.");
  }

  return secret;
}

export function createOrderTrackingToken(orderId: string) {
  return createHmac("sha256", getTrackingSecret())
    .update(`order-tracking:${orderId}`)
    .digest("base64url");
}

export function verifyOrderTrackingToken(
  orderId: string,
  token: string | undefined
) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return false;
  }

  const expected = createOrderTrackingToken(orderId);
  const receivedBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}
