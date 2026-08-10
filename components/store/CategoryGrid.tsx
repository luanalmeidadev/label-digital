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

        <h2 className="mt-1 text-2xl font-bold">
          Escolha uma categoria
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {categories.map((category) => (
          <button
            type="button"
            key={category.id}
            className="flex min-h-[110px] flex-col items-center justify-center rounded-2xl border border-[#EEE6DF] bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[#D2B48C]"
          >
            <span className="text-3xl">
              {emojiBySlug[category.slug] ?? "🍽️"}
            </span>

            <span className="mt-3 text-xs font-bold text-[#241B19] sm:text-sm">
              {category.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}