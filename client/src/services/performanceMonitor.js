/**
 * Performance Monitoring Service
 * Track and monitor application performance metrics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.marks = {};
    this.isEnabled = true;
  }

  /**
   * Mark a point in time
   */
  mark(name) {
    if (!this.isEnabled) return;

    this.marks[name] = {
      timestamp: performance.now(),
      memory: this.getMemoryUsage(),
    };
  }

  /**
   * Measure duration between two marks
   */
  measure(name, startMark, endMark = null) {
    if (!this.isEnabled) return;

    const end = endMark ? this.marks[endMark]?.timestamp : performance.now();
    const start = this.marks[startMark]?.timestamp;

    if (!start) {
      console.warn(`❌ Start mark '${startMark}' not found`);
      return;
    }

    const duration = end - start;

    if (!this.metrics[name]) {
      this.metrics[name] = {
        measurements: [],
        min: Infinity,
        max: -Infinity,
        average: 0,
        total: 0,
      };
    }

    const metric = this.metrics[name];
    metric.measurements.push(duration);
    metric.total += duration;
    metric.min = Math.min(metric.min, duration);
    metric.max = Math.max(metric.max, duration);
    metric.average = metric.total / metric.measurements.length;

    return duration;
  }

  /**
   * Get Core Web Vitals
   */
  getCoreWebVitals() {
    const vitals = {
      LCP: null, // Largest Contentful Paint
      FID: null, // First Input Delay
      CLS: null, // Cumulative Layout Shift
    };

    // Observe LCP (Largest Contentful Paint)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        vitals.LCP = lastEntry.renderTime || lastEntry.loadTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('LCP not supported:', error);
    }

    // Observe FID (First Input Delay)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          vitals.FID = entry.processingDuration;
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('FID not supported:', error);
    }

    // Observe CLS (Cumulative Layout Shift)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        vitals.CLS = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('CLS not supported:', error);
    }

    return vitals;
  }

  /**
   * Get Navigation Timing metrics
   */
  getNavigationTiming() {
    const timing = performance.getEntriesByType('navigation')[0];

    if (!timing) return null;

    return {
      DNS: timing.domainLookupEnd - timing.domainLookupStart,
      TCP: timing.connectEnd - timing.connectStart,
      TLS: timing.secureConnectionStart > 0 
        ? timing.connectEnd - timing.secureConnectionStart 
        : 0,
      Request: timing.responseStart - timing.requestStart,
      Response: timing.responseEnd - timing.responseStart,
      DOM: timing.domContentLoadedEventEnd - timing.domInteractive,
      DOMContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      Load: timing.loadEventEnd - timing.navigationStart,
    };
  }

  /**
   * Get Resource Timing metrics
   */
  getResourceTiming() {
    const resources = performance.getEntriesByType('resource');

    return {
      count: resources.length,
      totalSize: Math.round(resources.reduce((sum, r) => sum + r.transferSize, 0) / 1024),
      totalDuration: Math.round(resources.reduce((sum, r) => sum + r.duration, 0)),
      byType: {
        images: resources.filter(r => r.initiatorType === 'img').length,
        scripts: resources.filter(r => r.initiatorType === 'script').length,
        styles: resources.filter(r => r.initiatorType === 'link').length,
        xhr: resources.filter(r => r.initiatorType === 'xmlhttprequest').length,
      },
    };
  }

  /**
   * Get memory usage (Chrome only)
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
        percentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100,
      };
    }
    return null;
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      custom: this.metrics,
      navigationTiming: this.getNavigationTiming(),
      resourceTiming: this.getResourceTiming(),
      coreWebVitals: this.getCoreWebVitals(),
      memory: this.getMemoryUsage(),
    };
  }

  /**
   * Get metric summary
   */
  getMetricSummary(name) {
    if (!this.metrics[name]) return null;

    const metric = this.metrics[name];
    return {
      name,
      measurements: metric.measurements.length,
      min: Math.round(metric.min),
      max: Math.round(metric.max),
      average: Math.round(metric.average),
      total: Math.round(metric.total),
      p95: Math.round(this.getPercentile(metric.measurements, 95)),
      p99: Math.round(this.getPercentile(metric.measurements, 99)),
    };
  }

  /**
   * Calculate percentile
   */
  getPercentile(arr, percentile) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const metrics = this.getMetrics();
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...metrics,
    };

    return report;
  }

  /**
   * Send report to server
   */
  async sendReport(token) {
    if (!this.isEnabled) return;

    const report = this.generateReport();

    try {
      await fetch('/v1/metrics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(report),
      });

      console.log('✅ Performance report sent');
    } catch (error) {
      console.error('❌ Failed to send performance report:', error);
    }
  }

  /**
   * Log metrics to console
   */
  logMetrics(name = null) {
    if (name) {
      const summary = this.getMetricSummary(name);
      if (summary) {
        console.table(summary);
      }
    } else {
      console.table(this.metrics);
    }
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics() {
    const data = this.getMetrics();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {};
    this.marks = {};
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }
}

export default new PerformanceMonitor();
