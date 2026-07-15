/**
 * Observability hooks: metrics, tracing, job monitoring, error monitoring.
 * Integrations are optional — enabled via env (SENTRY_DSN, METRICS_ENABLED).
 */

import { logger } from "./logger";
import { config } from "../config/env";

type Labels = Record<string, string | number | boolean | undefined>;

const counters = new Map<string, number>();
const gauges = new Map<string, number>();

export function incrementMetric(name: string, by = 1, labels?: Labels) {
  if (!config.metricsEnabled && !config.isProd) {
    counters.set(name, (counters.get(name) ?? 0) + by);
    return;
  }
  counters.set(name, (counters.get(name) ?? 0) + by);
  logger.debug({ metric: name, by, labels, value: counters.get(name) }, "metric.increment");
}

export function setGauge(name: string, value: number, labels?: Labels) {
  gauges.set(name, value);
  logger.debug({ metric: name, value, labels }, "metric.gauge");
}

export function getMetricsSnapshot() {
  return {
    counters: Object.fromEntries(counters),
    gauges: Object.fromEntries(gauges),
  };
}

/** Request tracing hook — pair with X-Request-Id middleware */
export function startSpan(name: string, attrs?: Labels) {
  const start = Date.now();
  const spanId = `${name}-${start.toString(36)}`;
  logger.debug({ spanId, name, attrs }, "trace.start");
  return {
    spanId,
    end(status: "ok" | "error" = "ok", extra?: Labels) {
      const durationMs = Date.now() - start;
      incrementMetric(`span.${name}.${status}`);
      logger.debug({ spanId, name, status, durationMs, ...extra }, "trace.end");
      return durationMs;
    },
  };
}

/** Background job monitoring hooks */
export function jobStarted(jobName: string, meta?: Labels) {
  incrementMetric(`job.${jobName}.started`);
  logger.info({ jobName, ...meta }, "job.started");
  return startSpan(`job.${jobName}`, meta);
}

export function jobSucceeded(jobName: string, durationMs?: number) {
  incrementMetric(`job.${jobName}.succeeded`);
  logger.info({ jobName, durationMs }, "job.succeeded");
}

export function jobFailed(jobName: string, err: unknown) {
  incrementMetric(`job.${jobName}.failed`);
  logger.error({ jobName, err }, "job.failed");
  captureException(err, { jobName });
}

/** Error monitoring integration hook (Sentry-compatible shape) */
export function captureException(err: unknown, context?: Labels) {
  if (config.sentryDsn) {
    logger.error({ err, context, sentryDsnConfigured: true }, "error.monitoring.capture");
    // Production: initialize @sentry/node when DSN present — hook only to avoid hard dep
  } else {
    logger.error({ err, context }, "error.capture");
  }
}

export function cacheGetHook(key: string): null {
  incrementMetric("cache.miss");
  logger.debug({ key }, "cache.get miss (no cache backend configured)");
  return null;
}

export function cacheSetHook(key: string, _value: unknown, ttlSeconds?: number) {
  incrementMetric("cache.set");
  logger.debug({ key, ttlSeconds }, "cache.set hook");
}
