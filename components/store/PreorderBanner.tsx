import { ChevronRight } from "lucide-react";

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
          A área de encomendas será separada dos produtos disponíveis no dia.
        </p>

        <button
          type="button"
          disabled
          className="mt-6 flex items-center gap-2 rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-bold text-white opacity-60"
        >
          Ver encomendas
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}