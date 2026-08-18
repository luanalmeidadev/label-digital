import { describe, expect, it } from "vitest";

import {
  buildWhatsAppAppUrl,
  buildWhatsAppParams,
  buildWhatsAppShortUrl,
  buildWhatsAppWebUrl,
} from "@/lib/whatsapp-link";

const phone = "5548999999999";
const message = [
  "\u{1F370} *LA'BEL CONFEITARIA*",
  "\u{1F6CD}\uFE0F *ITENS*",
  "Podemos confirmar o pedido? \u{1F60A}",
].join("\n");

describe("links do WhatsApp", () => {
  it("preserva emojis e acentos nos parâmetros", () => {
    const params = new URLSearchParams(
      buildWhatsAppParams(phone, message)
    );

    expect(params.get("phone")).toBe(phone);
    expect(params.get("text")).toBe(message);
    expect(params.get("text")).not.toContain("\uFFFD");
  });

  it.each([
    buildWhatsAppAppUrl(phone, message),
    buildWhatsAppWebUrl(phone, message),
    buildWhatsAppShortUrl(phone, message),
  ])("codifica a mensagem em UTF-8 no endereço %s", (url) => {
    expect(url).toContain("%F0%9F%8D%B0");
    expect(url).not.toContain("%EF%BF%BD");
  });
});
