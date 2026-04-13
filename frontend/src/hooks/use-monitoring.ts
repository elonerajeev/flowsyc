import { useEffect } from 'react'
import { PerformanceMonitor } from '@/lib/performance'
import { ErrorTracker } from '@/lib/error-tracker'
import { getEnvWarnings } from '@/lib/env'

export function useMonitoring() {
  useEffect(() => {
    const initMonitoring = async () => {
      const perfMonitor = PerformanceMonitor.getInstance()
      const errorTracker = ErrorTracker.getInstance()

      // Initialize monitoring
      await perfMonitor.recordWebVitals()
      errorTracker.init()

      const envWarnings = getEnvWarnings()
      envWarnings.forEach((warning) => console.warn(warning))
    }

    initMonitoring()

    // Send metrics periodically
    const perfMonitor = PerformanceMonitor.getInstance()
    const interval = setInterval(() => {
      perfMonitor.sendMetrics()
    }, 60000) // Every minute

    return () => clearInterval(interval)
  }, [])
}

// Hook for measuring component performance
export function usePerformanceTrace(componentName: string) {
  useEffect(() => {
    const start = performance.now()
    
    return () => {
      const end = performance.now()
      const monitor = PerformanceMonitor.getInstance()
      monitor.measureRender(componentName, () => {
        // Component cleanup time
      })
    }
  }, [componentName])
}
