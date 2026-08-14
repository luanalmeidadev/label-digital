import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function PreorderBanner() {
  return (
    <section className="pb-8">
      <div className="rounded-3xl bg-[#D2B48C] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
          Encomendas
        </p>

        <h2 className="mt-2 max-w-lg text-2xl font-bold text-[#8B0000] sm:text-3xl">
          Planejando algo especial?
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-6 text-[#49352C]">
          Bolos, doces, brownies e sobremesas feitos especialmente para a sua celebração.
        </p>

        <Link
          href="/encomendas"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#700000]"
        >
          Ver encomendas
          <ChevronRight size={18} />
        </Link>
      </div>
    </section>
  );
}
