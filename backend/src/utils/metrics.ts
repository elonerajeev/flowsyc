import { Counter, Histogram, Gauge, collectDefaultMetrics, register } from 'prom-client';

// Collect default Node.js metrics
collectDefaultMetrics();

export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
});

export const httpResponseTime = new Histogram({
  name: 'http_response_time_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['route'] as const,
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

export const dbActiveConnections = new Gauge({
  name: 'db_active_connections',
  help: 'Number of active Prisma DB connections',
});

export const prometheusRegistry = register;
