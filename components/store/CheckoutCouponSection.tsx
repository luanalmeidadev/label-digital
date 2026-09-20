"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { validateCouponForCheckout } from "@/app/store/checkout/actions";
import type { CartItem, CartOptionSnapshot } from "@/lib/cart";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export type AppliedCoupon = {
  code: string;
  discountPercent: number;
  discountAmount: number;
};

type CheckoutCouponSectionProps = {
  subtotal: number;
  cartItems: CartItem[];
  open: boolean;
  onCouponResolved: (coupon: AppliedCoupon | null) => void;
};

export default function CheckoutCouponSection({
  subtotal,
  cartItems,
  open,
  onCouponResolved,
}: CheckoutCouponSectionProps) {
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");

  const appliedCouponCode = appliedCoupon?.code;
  const hasPromotionalItems = cartItems.some(i => i.observedPromotionalBaseUnitPrice != null);

  // Limpa o cupom resolvido no pai quando desmonta (carrinho zerado)
  useEffect(() => {
    return () => {
      onCouponResolved(null);
    };
  }, [onCouponResolved]);

  // Propaga mudança do cupom interno pro pai
  useEffect(() => {
    onCouponResolved(appliedCoupon);
  }, [appliedCoupon, onCouponResolved]);

  // Construir o payload de itens
  const checkoutItemsPayload = useMemo(() => cartItems.map(item => ({
    productId: item.id,
    catalogVersion: item.catalogVersion,
    variantId: item.variant?.id || null,
    optionIds: item.options?.map((o: CartOptionSnapshot) => o.id) || [],
    quantity: item.quantity,
    itemNotes: item.itemNotes || null,
    observedEventId: item.observedEventId || null,
    observedPromotionalBaseUnitPrice: item.observedPromotionalBaseUnitPrice ?? null,
  })), [cartItems]);

  // Re-validar desconto visualmente caso subtotal/itens mudem
  useEffect(() => {
    let active = true;

    async function revalidate() {
      if (!appliedCouponCode || !open) return;

      const result = await validateCouponForCheckout(appliedCouponCode, checkoutItemsPayload);

      if (!active) return;

      if (result.valid) {
        setAppliedCoupon({
          code: result.code,
          discountPercent: result.discountPercent,
          discountAmount: result.discountAmount,
        });
      } else {
        setAppliedCoupon(null);
        setCouponMessage(result.error);
      }
    }

    revalidate();

    return () => {
      active = false;
    };
  }, [subtotal, checkoutItemsPayload, open, appliedCouponCode]);

  async function handleApplyCoupon() {
    if (!couponCodeInput.trim()) {
      setCouponMessage("");
      setAppliedCoupon(null);
      return;
    }
    setCouponLoading(true);
    setCouponMessage("");
    const result = await validateCouponForCheckout(couponCodeInput, checkoutItemsPayload);
    setCouponLoading(false);

    if (result.valid) {
      setAppliedCoupon({
        code: result.code,
        discountPercent: result.discountPercent,
        discountAmount: result.discountAmount,
      });
      setCouponCodeInput(result.code);
    } else {
      setAppliedCoupon(null);
      setCouponMessage(result.error);
    }
  }

  function handleRemoveCoupon() {
    setCouponCodeInput("");
    setAppliedCoupon(null);
    setCouponMessage("");
  }

  return (
    <>
      <div className="mt-4 border-t border-brand-border pt-4">
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-[#49352C]">
            Cupom de desconto
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCodeInput}
              onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
              placeholder="Ex: PROMO10"
              disabled={couponLoading || appliedCoupon !== null}
              className="h-10 w-full min-w-0 rounded-xl border border-[#E6DDD6] bg-white px-3 text-sm uppercase outline-none focus:border-brand-primary disabled:bg-brand-surface-muted disabled:text-brand-muted-foreground"
            />
            {appliedCoupon ? (
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="flex h-10 w-24 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-600 transition hover:bg-red-100"
              >
                Remover
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={!couponCodeInput.trim() || couponLoading}
                className="flex h-10 w-24 shrink-0 items-center justify-center rounded-xl bg-brand-surface-muted text-xs font-bold text-brand-primary transition hover:bg-brand-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {couponLoading ? <Loader2 size={16} className="animate-spin" /> : "Aplicar"}
              </button>
            )}
          </div>
          {couponMessage && (
            <p className="mt-2 text-xs font-bold text-red-600">
              {couponMessage}
            </p>
          )}
        </label>
        {hasPromotionalItems && (
          <p className="mt-2 text-xs text-brand-muted-foreground">
            Produtos em promoção não acumulam cupom.
          </p>
        )}
      </div>

      {appliedCoupon && (
        <div className="mt-3 flex justify-between gap-4">
          <span className="text-sm text-brand-muted-foreground">
            Desconto ({appliedCoupon.discountPercent}%)
          </span>
          <span className="text-sm font-bold text-green-600">
            -{formatCurrency(appliedCoupon.discountAmount)}
          </span>
        </div>
      )}
    </>
  );
}
