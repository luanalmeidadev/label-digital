import Image from "next/image";
import Link from "next/link";
import { loginAdmin } from "./actions";

const loginErrorMessages: Record<string, string> = {
  missing: "Preencha o e-mail e a senha.",
  invalid: "E-mail ou senha incorretos.",
  "invalid-link":
    "Este convite é inválido ou expirou. Solicite um novo convite ao administrador.",
};

const loginStatusMessages: Record<string, string> = {
  "password-updated":
    "Senha atualizada. Entre usando a nova senha.",
  "session-ended":
    "Sua sessão foi encerrada ao fechar a aba. Entre novamente.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const errorValue = params.error;
  const statusValue = params.status;
  const errorKey = Array.isArray(errorValue)
    ? errorValue[0]
    : errorValue;
  const errorMessage = errorKey
    ? loginErrorMessages[errorKey]
    : null;
  const statusKey = Array.isArray(statusValue)
    ? statusValue[0]
    : statusValue;
  const statusMessage = statusKey
    ? loginStatusMessages[statusKey]
    : null;

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
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700"
            >
              {errorMessage}
            </div>
          )}

          {statusMessage && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-green-100 bg-green-50 p-3 text-sm font-semibold text-green-700"
            >
              {statusMessage}
            </div>
          )}

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
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="password"
                className="text-sm font-bold text-[#241B19]"
              >
                Senha
              </label>
              <Link
                href="/admin/recuperar-senha"
                className="text-xs font-bold text-[#8B0000] hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>

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
