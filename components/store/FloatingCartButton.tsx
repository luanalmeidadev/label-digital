"use client";

import { ShoppingBag } from "lucide-react";

import { useCart } from "./CartProvider";

type FloatingCartButtonProps = {
  onClick: () => void;
};

export default function FloatingCartButton({
  onClick,
}: FloatingCartButtonProps) {
  const { totalItems, subtotal } = useCart();

  if (totalItems === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir sacola"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full bg-[#8B0000] px-4 py-3 text-white shadow-xl transition hover:bg-[#700000]"
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
        <ShoppingBag size={19} />

        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D2B48C] px-1 text-[10px] font-bold text-[#8B0000]">
          {totalItems}
        </span>
      </span>

      <div className="hidden text-left sm:block">
        <p className="text-[11px] font-semibold text-white/70">
          Sua sacola
        </p>

        <p className="text-sm font-bold">
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(subtotal)}
        </p>
      </div>
    </button>
  );
}