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
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">
          {eyebrow}
        </p>

        <h1 className="mt-2 text-3xl font-bold text-brand-foreground">
          {title}
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-muted-foreground">
          {description}
        </p>

        <div className="mt-8 rounded-3xl border border-brand-border bg-white p-10 text-center shadow-sm">
          <p className="font-bold text-brand-foreground">
            Esta área já está preparada.
          </p>

          <p className="mt-2 text-sm text-brand-muted-foreground">
            A funcionalidade será implementada na próxima etapa.
          </p>
        </div>
      </div>
    </main>
  );
}