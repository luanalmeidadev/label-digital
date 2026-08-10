import { Clock3, MapPin } from "lucide-react";

export default function Hero() {
  return (
    <section className="bg-[#8B0000] pb-10">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D2B48C]">
            La&apos;bel Confeitaria
          </p>

          <h1 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
            Um doce momento começa por aqui.
          </h1>

          <p className="mt-4 max-w-md text-sm leading-6 text-white/75 sm:text-base">
            Escolha seus favoritos, monte seu pedido e continue o atendimento
            pelo WhatsApp.
          </p>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 text-white">
            <Clock3 size={20} className="mt-0.5 shrink-0 text-[#D2B48C]" />

            <div>
              <p className="text-sm font-bold">Horário de atendimento</p>
              <p className="mt-1 text-xs leading-5 text-white/70">
                Terça a sexta: 09:00 às 19:00
                <br />
                Sábado: 09:00 às 17:00
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 text-white">
            <MapPin size={20} className="mt-0.5 shrink-0 text-[#D2B48C]" />

            <div>
              <p className="text-sm font-bold">Retirada ou entrega</p>
              <p className="mt-1 text-xs leading-5 text-white/70">
                Escolha como prefere receber seu pedido.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}