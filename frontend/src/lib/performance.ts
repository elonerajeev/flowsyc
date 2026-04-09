import { appEnv, isProduction } from "@/lib/env";

type Metric = { value: number };

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Measure component render time
  measureRender(componentName: string, renderFn: () => void): void {
    const start = performance.now()
    renderFn()
    const end = performance.now()
    
    this.recordMetric(`render_${componentName}`, end - start)
  }

  // Measure API call duration
  async measureApiCall<T>(name: string, apiCall: () => Promise<T>): Promise<T> {
    const start = performance.now()
    try {
      const result = await apiCall()
      const end = performance.now()
      this.recordMetric(`api_${name}`, end - start)
      return result
    } catch (error) {
      const end = performance.now()
      this.recordMetric(`api_${name}_error`, end - start)
      throw error
    }
  }

  // Record Core Web Vitals using web-vitals library or fallback
  async recordWebVitals(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');
      getCLS((metric: Metric) => this.recordMetric('cls', metric.value));
      getFID((metric: Metric) => this.recordMetric('fid', metric.value));
      getFCP((metric: Metric) => this.recordMetric('fcp', metric.value));
      getLCP((metric: Metric) => this.recordMetric('lcp', metric.value));
      getTTFB((metric: Metric) => this.recordMetric('ttfb', metric.value));
    } catch (error) {
      // Fallback to manual implementation
      console.warn('web-vitals not available, using manual performance monitoring');
      this.recordWebVitalsManual();
    }
  }

  // Manual implementation as fallback
  private recordWebVitalsManual(): void {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        this.recordMetric('lcp', lastEntry.startTime);
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if ('processingStart' in entry) {
          const firstInputEntry = entry as PerformanceEventTiming;
          this.recordMetric('fid', firstInputEntry.processingStart - firstInputEntry.startTime);
        }
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      let clsValue = 0;
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if ('hadRecentInput' in entry && 'value' in entry) {
          const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value ?? 0;
          }
        }
      });
      this.recordMetric('cls', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)

    // Log slow operations in development
    if (!isProduction) {
      if (name.startsWith('render_') && value > 16) {
        console.warn(`Slow render detected: ${name} took ${value.toFixed(2)}ms`)
      }
      if (name.startsWith('api_') && value > 1000) {
        console.warn(`Slow API call: ${name} took ${value.toFixed(2)}ms`)
      }
    }
  }

  // Get performance report
  getReport(): Record<string, { avg: number; max: number; count: number }> {
    const report: Record<string, { avg: number; max: number; count: number }> = {}
    
    this.metrics.forEach((values, name) => {
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length
      const max = Math.max(...values)
      report[name] = { avg, max, count: values.length }
    })
    
    return report
  }

  // Send metrics to analytics service
  async sendMetrics(): Promise<void> {
    if (appEnv.enableAnalytics && appEnv.analyticsEndpoint) {
      const report = this.getReport()
      
      try {
        await fetch(appEnv.analyticsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: "performance", payload: report }),
        })
      } catch (error) {
        console.error('Failed to send performance metrics:', error)
      }
    }
  }
}
