"use client";

import { Plus } from "lucide-react";

import { useCart } from "./CartProvider";

type AddToCartButtonProps = {
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
};

export default function AddToCartButton({
  product,
}: AddToCartButtonProps) {
  const { addItem } = useCart();

  return (
    <button
      type="button"
      onClick={() => addItem(product)}
      className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#8B0000] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#6F0000]"
    >
      <Plus size={15} />
      Adicionar
    </button>
  );
}