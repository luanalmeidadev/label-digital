"use client";

import Script from "next/script";
import {
  useEffect,
  useRef,
  useState,
} from "react";

type TurnstileWidgetProps = {
  action: "daily_order" | "preorder";
  onTokenChange: (token: string) => void;
  resetKey: number;
};

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "light";
      size: "flexible";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const developmentToken = "development-bypass";
const siteKey =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

function DevelopmentSecurityCheck({
  onTokenChange,
  resetKey,
}: Pick<
  TurnstileWidgetProps,
  "onTokenChange" | "resetKey"
>) {
  useEffect(() => {
    onTokenChange(developmentToken);

    return () => onTokenChange("");
  }, [onTokenChange, resetKey]);

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
      Verificação de segurança ativa no ambiente
      de testes.
    </div>
  );
}

function ProductionTurnstileWidget({
  action,
  onTokenChange,
  resetKey,
}: TurnstileWidgetProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] =
    useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const turnstile = window.turnstile;

    if (
      !siteKey ||
      !scriptReady ||
      !container ||
      !turnstile
    ) {
      return;
    }

    onTokenChange("");
    const widgetId = turnstile.render(
      container,
      {
        sitekey: siteKey,
        action,
        theme: "light",
        size: "flexible",
        callback: onTokenChange,
        "expired-callback": () =>
          onTokenChange(""),
        "error-callback": () =>
          onTokenChange(""),
      }
    );

    return () => {
      turnstile.remove(widgetId);
    };
  }, [
    action,
    onTokenChange,
    resetKey,
    scriptReady,
  ]);

  if (!siteKey) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
        A verificação de segurança precisa ser
        configurada antes de receber pedidos.
      </div>
    );
  }

  return (
    <div className="min-h-[65px] w-full overflow-hidden rounded-xl">
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

export default function TurnstileWidget({
  action,
  onTokenChange,
  resetKey,
}: TurnstileWidgetProps) {
  if (process.env.NODE_ENV !== "production") {
    return (
      <DevelopmentSecurityCheck
        onTokenChange={onTokenChange}
        resetKey={resetKey}
      />
    );
  }

  return (
    <ProductionTurnstileWidget
      action={action}
      onTokenChange={onTokenChange}
      resetKey={resetKey}
    />
  );
}
