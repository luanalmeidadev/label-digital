"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

export default function PrintOrderButton({
  autoPrint = false,
}: {
  autoPrint?: boolean;
}) {
  useEffect(() => {
    if (!autoPrint) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoPrint]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-5 text-sm font-bold text-white transition hover:bg-[#700000] print:hidden"
    >
      <Printer size={17} />
      Imprimir pedido
    </button>
  );
}