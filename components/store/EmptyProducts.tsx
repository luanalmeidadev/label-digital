import Image from "next/image";

export default function EmptyProducts() {
  return (
    <section className="pb-8">
      <div className="rounded-3xl border border-[#EEE6DF] bg-white p-8 text-center shadow-sm">
        <Image
          src="/brand/icon-vermelho.svg"
          alt=""
          width={70}
          height={70}
          className="mx-auto opacity-20"
        />

        <h2 className="mt-5 text-xl font-bold text-[#241B19]">
          Produtos em breve
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#756A66]">
          Estamos preparando o cardápio digital da La&apos;bel.
          Os produtos serão cadastrados em breve.
        </p>
      </div>
    </section>
  );
}