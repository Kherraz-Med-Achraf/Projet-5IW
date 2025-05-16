import * as Sentry from "@sentry/nestjs";               
import * as fs from "fs";

const dsn = fs
  .readFileSync("/run/secrets/sentry_dsn", "utf8")
  .trim();

Sentry.init({
  dsn,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  debug: true,    
});
