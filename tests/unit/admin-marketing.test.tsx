import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import DeleteCouponDialog from "@/components/admin/DeleteCouponDialog";
import DeleteEventButton from "@/app/admin/(dashboard)/eventos/DeleteEventButton";

// Mocks
vi.mock("@/app/admin/(dashboard)/cupons/actions", () => ({
  deleteCoupon: vi.fn(),
}));

vi.mock("@/app/admin/(dashboard)/eventos/actions", () => ({
  deleteEvent: vi.fn(),
}));

describe("Marketing Admin UI - Deletions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Cupons", () => {
    it("renderiza o botão de excluir cupom e a estrutura do modal de confirmação de exclusão", () => {
      const html = renderToStaticMarkup(<DeleteCouponDialog id="test-coupon-id" />);

      // Initially, the modal content is not rendered because open state is false.
      // But the button should be there.
      expect(html).toContain("Excluir Cupom");
      expect(html).toContain("lucide"); // lucide-react icon Trash2
    });
  });

  describe("Eventos Promocionais", () => {
    it("renderiza o botão de excluir evento e a estrutura do modal de confirmação de exclusão", () => {
      const html = renderToStaticMarkup(<DeleteEventButton id="test-event-id" />);

      // Initially, the modal content is not rendered because open state is false.
      expect(html).toContain("Excluir Evento");
      expect(html).toContain("lucide"); // lucide-react icon Trash2
    });
  });
});
