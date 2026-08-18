import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
const environment =
  process.env.NEXT_PUBLIC_APP_ENV?.trim() ||
  process.env.VERCEL_ENV ||
  process.env.NODE_ENV;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment,
  sendDefaultPii: false,
  tracesSampleRate:
    environment === "production" ? 0.1 : 0.25,
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;
      delete event.request.headers;
      delete event.request.query_string;
    }

    return event;
  },
});
