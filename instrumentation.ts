import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context
) => {
  Sentry.captureRequestError(error, request, context);

  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const digest =
    typeof error === "object" &&
    error !== null &&
    "digest" in error
      ? String(error.digest)
      : undefined;

  console.error(
    JSON.stringify({
      event: "server_request_error",
      timestamp: new Date().toISOString(),
      name:
        error instanceof Error
          ? error.name
          : "UnknownError",
      message:
        error instanceof Error
          ? error.message
          : "Erro desconhecido",
      digest,
      method: request.method,
      route: context.routePath,
      routeType: context.routeType,
    })
  );
};
