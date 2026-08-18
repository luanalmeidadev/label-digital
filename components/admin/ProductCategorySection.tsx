"use client";

import { type ReactNode, useState } from "react";
import { ChevronDown, Package } from "lucide-react";

type ProductCategorySectionProps = {
  name: string;
  productCount: number;
  active: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
};

export default function ProductCategorySection({
  name,
  productCount,
  active,
  defaultOpen = false,
  children,
}: ProductCategorySectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 bg-[#FFFDF9] px-5 py-4 text-left transition hover:bg-[#FFF8F4]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
            <Package size={18} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-bold text-[#241B19]">
                {name}
              </h3>

              {!active && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  Categoria inativa
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-[#756A66]">
              {productCount}{" "}
              {productCount === 1 ? "produto" : "produtos"}
            </p>
          </div>
        </div>

        <ChevronDown
          size={20}
          aria-hidden="true"
          className={`shrink-0 text-[#8B0000] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="divide-y divide-[#EEE6DF] border-t border-[#EEE6DF]">
          {children}
        </div>
      )}
    </section>
  );
}
