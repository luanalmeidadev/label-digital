type AdminPagePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export default function AdminPagePlaceholder({
  eyebrow,
  title,
  description,
}: AdminPagePlaceholderProps) {
  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
          {eyebrow}
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#241B19]">
          {title}
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#756A66]">
          {description}
        </p>

        <div className="mt-8 rounded-3xl border border-[#EEE6DF] bg-white p-10 text-center shadow-sm">
          <p className="font-bold text-[#241B19]">
            Esta área já está preparada.
          </p>

          <p className="mt-2 text-sm text-[#756A66]">
            A funcionalidade será implementada na próxima etapa.
          </p>
        </div>
      </div>
    </main>
  );
}