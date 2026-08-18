"use client";

import { useState, useTransition } from "react";
import { Activity, Loader2 } from "lucide-react";

import {
  sendMonitoringTestEvent,
  type MonitoringTestResult,
} from "@/app/admin/(dashboard)/configuracoes/actions";

export default function MonitoringTestCard() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] =
    useState<MonitoringTestResult | null>(null);

  function sendTest() {
    setResult(null);

    startTransition(async () => {
      setResult(await sendMonitoringTestEvent());
    });
  }

  return (
    <section className="mt-8 rounded-3xl border border-[#EEE6DF] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="font-bold text-[#241B19]">
              Monitoramento do sistema
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#756A66]">
              Envie um evento controlado para confirmar que os erros estão
              chegando ao Sentry. Nenhum pedido ou dado de cliente será usado.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={sendTest}
          disabled={pending}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-600 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="animate-spin" size={17} />
          ) : (
            <Activity size={17} />
          )}
          {pending ? "Enviando..." : "Testar monitoramento"}
        </button>
      </div>

      {result && (
        <div
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 text-xs font-semibold ${
            result.success
              ? "bg-green-50 text-green-700"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          <p>{result.message}</p>
          {result.eventId && (
            <p className="mt-1 break-all font-mono font-normal">
              Evento: {result.eventId}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
