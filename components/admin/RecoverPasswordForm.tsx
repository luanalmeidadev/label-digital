"use client";

import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";

type RecoveryStep =
  | "email"
  | "code"
  | "password";

export default function RecoverPasswordForm() {
  const router = useRouter();
  const [step, setStep] =
    useState<RecoveryStep>("email");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] =
    useTransition();

  async function sendRecoveryCode(
    recoveryEmail: string
  ) {
    const { error: requestError } =
      await supabase.auth.resetPasswordForEmail(
        recoveryEmail,
        {
          redirectTo: `${window.location.origin}/admin/recuperar-senha`,
        }
      );

    if (requestError) {
      setError(
        requestError.status === 429
          ? "Muitas tentativas. Aguarde alguns minutos antes de solicitar outro código."
          : "Não foi possível enviar o código agora. Tente novamente."
      );
      return false;
    }

    setMessage(
      "Se este e-mail estiver cadastrado, você receberá um código para redefinir a senha."
    );
    return true;
  }

  function handleEmailSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    const formData = new FormData(
      event.currentTarget
    );
    const recoveryEmail = String(
      formData.get("email") ?? ""
    )
      .trim()
      .toLowerCase();

    setError("");
    setMessage("");

    startTransition(async () => {
      const sent = await sendRecoveryCode(
        recoveryEmail
      );

      if (sent) {
        setEmail(recoveryEmail);
        setStep("code");
      }
    });
  }

  function handleCodeSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    const formData = new FormData(
      event.currentTarget
    );
    const token = String(
      formData.get("code") ?? ""
    ).replace(/\D/g, "");

    setError("");
    setMessage("");

    if (token.length < 6) {
      setError("Digite o código recebido por e-mail.");
      return;
    }

    startTransition(async () => {
      const { error: verifyError } =
        await supabase.auth.verifyOtp({
          email,
          token,
          type: "recovery",
        });

      if (verifyError) {
        setError(
          "Código incorreto ou expirado. Confira o e-mail ou solicite um novo código."
        );
        return;
      }

      setStep("password");
    });
  }

  function handlePasswordSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    const formData = new FormData(
      event.currentTarget
    );
    const password = String(
      formData.get("password") ?? ""
    );
    const confirmation = String(
      formData.get("password_confirmation") ?? ""
    );

    setError("");
    setMessage("");

    if (password.length < 8) {
      setError(
        "A senha precisa ter pelo menos 8 caracteres."
      );
      return;
    }

    if (password !== confirmation) {
      setError("As senhas não são iguais.");
      return;
    }

    startTransition(async () => {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        setError(
          "Não foi possível salvar a nova senha. Solicite outro código e tente novamente."
        );
        return;
      }

      await supabase.auth.signOut();
      router.replace(
        "/admin/login?status=password-updated"
      );
      router.refresh();
    });
  }

  function handleResend() {
    setError("");
    setMessage("");

    startTransition(async () => {
      await sendRecoveryCode(email);
    });
  }

  return (
    <div className="rounded-3xl border border-[#EEE6DF] bg-white p-7 shadow-sm">
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-green-100 bg-green-50 p-3 text-sm font-semibold leading-5 text-green-700"
        >
          {message}
        </div>
      )}

      {step === "email" && (
        <form onSubmit={handleEmailSubmit}>
          <label className="block">
            <span className="text-sm font-bold text-[#241B19]">
              E-mail da conta
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              disabled={pending}
              placeholder="seu@email.com"
              className="mt-2 h-12 w-full rounded-xl border border-[#E5DDD6] bg-white px-4 outline-none transition focus:border-[#8B0000] disabled:opacity-60"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="mt-7 h-12 w-full rounded-xl bg-[#8B0000] font-bold text-white transition hover:bg-[#700000] disabled:opacity-60"
          >
            {pending
              ? "Enviando..."
              : "Enviar código"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleCodeSubmit}>
          <p className="mb-5 text-sm leading-6 text-[#756A66]">
            Digite o código enviado para{" "}
            <strong className="text-[#241B19]">
              {email}
            </strong>
            .
          </p>

          <label className="block">
            <span className="text-sm font-bold text-[#241B19]">
              Código de verificação
            </span>
            <input
              name="code"
              type="text"
              required
              minLength={6}
              maxLength={8}
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={pending}
              placeholder="000000"
              className="mt-2 h-12 w-full rounded-xl border border-[#E5DDD6] bg-white px-4 text-center text-lg font-bold tracking-[0.35em] outline-none transition focus:border-[#8B0000] disabled:opacity-60"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="mt-7 h-12 w-full rounded-xl bg-[#8B0000] font-bold text-white transition hover:bg-[#700000] disabled:opacity-60"
          >
            {pending
              ? "Verificando..."
              : "Confirmar código"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={pending}
            className="mt-3 h-11 w-full rounded-xl font-bold text-[#8B0000] transition hover:bg-[#8B0000]/5 disabled:opacity-60"
          >
            Enviar novo código
          </button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={handlePasswordSubmit}>
          <label className="block">
            <span className="text-sm font-bold text-[#241B19]">
              Nova senha
            </span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={pending}
              placeholder="Pelo menos 8 caracteres"
              className="mt-2 h-12 w-full rounded-xl border border-[#E5DDD6] bg-white px-4 outline-none transition focus:border-[#8B0000] disabled:opacity-60"
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-[#241B19]">
              Confirmar nova senha
            </span>
            <input
              name="password_confirmation"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={pending}
              placeholder="Repita a senha"
              className="mt-2 h-12 w-full rounded-xl border border-[#E5DDD6] bg-white px-4 outline-none transition focus:border-[#8B0000] disabled:opacity-60"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="mt-7 h-12 w-full rounded-xl bg-[#8B0000] font-bold text-white transition hover:bg-[#700000] disabled:opacity-60"
          >
            {pending
              ? "Salvando..."
              : "Salvar nova senha"}
          </button>
        </form>
      )}
    </div>
  );
}
