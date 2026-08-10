import Image from "next/image";
import { loginAdmin } from "./actions";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFFDF9] px-5">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/brand/monograma-vinho.svg"
            alt="La'bel"
            width={90}
            height={90}
            className="mx-auto"
            priority
          />

          <h1 className="mt-5 text-2xl font-bold text-[#241B19]">
            Administração La&apos;bel
          </h1>

          <p className="mt-2 text-sm text-[#756A66]">
            Entre para acessar o painel administrativo.
          </p>
        </div>

        <form
          action={loginAdmin}
          className="rounded-3xl border border-[#EEE6DF] bg-white p-7 shadow-sm"
        >
          <div>
            <label
              htmlFor="email"
              className="text-sm font-bold text-[#241B19]"
            >
              E-mail
            </label>

            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu@email.com"
              className="mt-2 h-12 w-full rounded-xl border border-[#E5DDD6] bg-white px-4 outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="password"
              className="text-sm font-bold text-[#241B19]"
            >
              Senha
            </label>

            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Sua senha"
              className="mt-2 h-12 w-full rounded-xl border border-[#E5DDD6] bg-white px-4 outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <button
            type="submit"
            className="mt-7 h-12 w-full rounded-xl bg-[#8B0000] font-bold text-white transition hover:bg-[#700000]"
          >
            Entrar
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#756A66]">
          Área restrita • La&apos;bel Confeitaria
        </p>
      </div>
    </main>
  );
}