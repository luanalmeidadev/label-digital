import { describe, expect, it } from "vitest";

interface StaleItem {
  observedEventId: string | null;
  observedPromotionalBaseUnitPrice: number | null;
  effectiveAvailable: boolean;
  catalogVersion: number;
}

function checkStaleness(pricedItem: StaleItem, normalizedItem: StaleItem) {
  let staleReason: "promotion" | "catalog" | null = null;

  const isPromotionStale =
    pricedItem.observedEventId !== normalizedItem.observedEventId ||
    pricedItem.observedPromotionalBaseUnitPrice !== normalizedItem.observedPromotionalBaseUnitPrice ||
    pricedItem.effectiveAvailable !== normalizedItem.effectiveAvailable; // D) disponibilidade mudou

  const isCatalogStale = pricedItem.catalogVersion !== normalizedItem.catalogVersion;

  if (isPromotionStale) {
    staleReason = "promotion";
  } else if (isCatalogStale) {
    staleReason = "catalog";
  }

  return staleReason;
}

describe("Stale State - Provar 4 Cenários", () => {
  it("A) Produto adicionado SEM promoção. Evento começa antes do submit.", () => {
    // Client snapshot (sem promoção)
    const normalizedItem = {
      catalogVersion: 1,
      observedEventId: null,
      observedPromotionalBaseUnitPrice: null,
      effectiveAvailable: true,
    };

    // Server resolution (evento começou)
    const pricedItem = {
      catalogVersion: 1,
      observedEventId: "event-123",
      observedPromotionalBaseUnitPrice: 20,
      effectiveAvailable: true,
    };

    const reason = checkStaleness(pricedItem, normalizedItem);
    expect(reason).toBe("promotion");
  });

  it("B) Produto adicionado COM promoção. Evento termina antes do submit.", () => {
    // Client snapshot (com promoção)
    const normalizedItem = {
      catalogVersion: 1,
      observedEventId: "event-123",
      observedPromotionalBaseUnitPrice: 20,
      effectiveAvailable: true,
    };

    // Server resolution (evento terminou)
    const pricedItem = {
      catalogVersion: 1,
      observedEventId: null,
      observedPromotionalBaseUnitPrice: null,
      effectiveAvailable: true,
    };

    const reason = checkStaleness(pricedItem, normalizedItem);
    expect(reason).toBe("promotion");
  });

  it("C) Produto adicionado COM promoção. Evento continua exatamente igual.", () => {
    // Client snapshot
    const normalizedItem = {
      catalogVersion: 1,
      observedEventId: "event-123",
      observedPromotionalBaseUnitPrice: 20,
      effectiveAvailable: true,
    };

    // Server resolution (inalterado)
    const pricedItem = {
      catalogVersion: 1,
      observedEventId: "event-123",
      observedPromotionalBaseUnitPrice: 20,
      effectiveAvailable: true,
    };

    const reason = checkStaleness(pricedItem, normalizedItem);
    expect(reason).toBeNull(); // conclui
  });

  it("D) Produto observado disponível. Evento altera effective availability antes do submit.", () => {
    // Client snapshot
    const normalizedItem = {
      catalogVersion: 1,
      observedEventId: "event-123",
      observedPromotionalBaseUnitPrice: null,
      effectiveAvailable: true,
    };

    // Server resolution (ficou indisponível devido ao evento ou config)
    const pricedItem = {
      catalogVersion: 1,
      observedEventId: "event-123",
      observedPromotionalBaseUnitPrice: null,
      effectiveAvailable: false,
    };

    const reason = checkStaleness(pricedItem, normalizedItem);
    expect(reason).toBe("promotion"); // ou erro equivalente
  });
});
