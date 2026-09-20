"use client";

import { Plus } from "lucide-react";

import { useCart } from "./CartProvider";

import { type CartCatalogProduct } from "@/lib/cart";

type AddToCartButtonProps = {
  product: CartCatalogProduct;
};

export default function AddToCartButton({
  product,
}: AddToCartButtonProps) {
  const { addItem } = useCart();

  return (
    <button
      type="button"
      onClick={() => addItem(product)}
      className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-3 py-2 text-xs font-bold text-brand-primary-foreground transition hover:bg-brand-primary-hover"
    >
      <Plus size={15} />
      Adicionar
    </button>
  );
}
