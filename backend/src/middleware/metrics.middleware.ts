import { Request, Response, NextFunction } from 'express';
import { httpRequestCounter, httpResponseTime } from '../utils/metrics';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const rawRoute = req.route?.path ?? req.path;
    const route = Array.isArray(rawRoute) ? rawRoute[0] : rawRoute;
    const duration = (Date.now() - start) / 1000;

    httpResponseTime
      .labels(route)
      .observe(duration);

    httpRequestCounter
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });

  next();
};
