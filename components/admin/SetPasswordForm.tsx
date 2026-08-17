"use client";

import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";

export default function SetPasswordForm() {
  const router = useRouter();
  const [pending, startTransition] =
    useTransition();
  const [error, setError] = useState("");

  function handleSubmit(
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
          "Não foi possível definir a senha. Solicite um novo convite ao administrador."
        );
        return;
      }

      router.replace("/admin");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-[#EEE6DF] bg-white p-7 shadow-sm"
    >
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700"
        >
          {error}
        </div>
      )}

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
        {pending ? "Salvando..." : "Criar minha senha"}
      </button>
    </form>
  );
}
