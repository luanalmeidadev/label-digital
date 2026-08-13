"use client";

import Image from "next/image";
import { ShoppingBag } from "lucide-react";

import { useCart } from "./CartProvider";

export default function Header() {
  const { totalItems } = useCart();

  return (
    <header className="bg-[#8B0000]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Image
          src="/brand/logo-creme.svg"
          alt="La'bel Confeitaria"
          width={180}
          height={70}
          priority
          className="h-auto w-[145px] sm:w-[175px]"
        />

        <button
          type="button"
          aria-label={`Abrir carrinho. ${totalItems} item(ns)`}
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-[#D2B48C] transition hover:bg-white/20"
        >
          <ShoppingBag size={21} />

          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D2B48C] px-1 text-[10px] font-bold text-[#8B0000]">
            {totalItems}
          </span>
        </button>
      </div>
    </header>
  );
}