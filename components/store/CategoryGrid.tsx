import { CakeSlice, ChevronRight } from "lucide-react";
import Link from "next/link";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type CategoryGridProps = {
  categories: Category[];
};

const emojiBySlug: Record<string, string> = {
  sobremesas: "🍰",
  salgados: "🥐",
  bebidas: "🥤",
};

export default function CategoryGrid({
  categories,
}: CategoryGridProps) {
  return (
    <section className="py-8">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
          Cardápio
        </p>

        <h2 className="mt-1 text-2xl font-bold text-[#241B19]">
          O que você deseja?
        </h2>

        <p className="mt-2 text-sm text-[#756A66]">
          Escolha uma categoria ou veja o cardápio completo abaixo.
        </p>
      </div>

      <Link
        href="/encomendas"
        className="group mb-4 flex items-center justify-between gap-4 rounded-2xl border border-[#8B0000] bg-[#8B0000] p-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#700000] sm:p-5"
      >
        <span className="flex min-w-0 items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-[#F3D9B6] transition group-hover:scale-105">
            <CakeSlice size={26} />
          </span>

          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#F3D9B6]">
              Cardápio de encomendas
            </span>
            <span className="mt-1 block text-base font-extrabold sm:text-lg">
              Quero encomendar
            </span>
            <span className="mt-0.5 block text-xs text-white/75">
              Bolos, doces e sobremesas para momentos especiais
            </span>
          </span>
        </span>

        <ChevronRight size={22} className="shrink-0" />
      </Link>

      <div className="grid grid-cols-3 gap-3">
        {categories.map((category) => (
          <a
            key={category.id}
            href={`#${category.slug}`}
            className="flex min-h-[105px] flex-col items-center justify-center rounded-2xl border border-[#EEE6DF] bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[#D2B48C]"
          >
            <span className="text-3xl">
              {emojiBySlug[category.slug] ??
                "🍽️"}
            </span>

            <span className="mt-3 text-xs font-bold text-[#241B19] sm:text-sm">
              {category.name}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
