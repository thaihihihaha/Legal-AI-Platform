/**
 * Logging Service
 * Centralized logging for all application events
 */

class LoggingService {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.isEnabled = import.meta.env.MODE === 'development' || localStorage.getItem('enable_logs') === 'true';
  }

  /**
   * Log level constants
   */
  static LEVELS = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    FATAL: 'FATAL',
  };

  /**
   * Log colors for console
   */
  static COLORS = {
    DEBUG: '#888',
    INFO: '#0066cc',
    WARN: '#ff9900',
    ERROR: '#cc0000',
    FATAL: '#660000',
  };

  /**
   * Format log message
   */
  formatMessage(level, message, data = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      url: window.location.pathname,
      userAgent: navigator.userAgent,
    };
  }

  /**
   * Store log in memory
   */
  storeLog(logEntry) {
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Log to console with styling
   */
  logToConsole(level, message, data) {
    if (!this.isEnabled) return;

    const color = LoggingService.COLORS[level];
    const timestamp = new Date().toISOString();

    console.log(
      `%c[${timestamp}] ${level}: ${message}`,
      `color: ${color}; font-weight: bold;`,
      data
    );
  }

  /**
   * Send log to server
   */
  async sendToServer(logEntry) {
    if (!this.isEnabled || import.meta.env.MODE === 'development') {
      return; // Don't send logs from dev environment
    }

    try {
      await fetch('/v1/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(logEntry),
      });
    } catch (error) {
      console.error('Failed to send log to server:', error);
    }
  }

  /**
   * Debug level logging
   */
  debug(message, data = {}) {
    const entry = this.formatMessage(LoggingService.LEVELS.DEBUG, message, data);
    this.storeLog(entry);
    this.logToConsole(LoggingService.LEVELS.DEBUG, message, data);
  }

  /**
   * Info level logging
   */
  info(message, data = {}) {
    const entry = this.formatMessage(LoggingService.LEVELS.INFO, message, data);
    this.storeLog(entry);
    this.logToConsole(LoggingService.LEVELS.INFO, message, data);
  }

  /**
   * Warning level logging
   */
  warn(message, data = {}) {
    const entry = this.formatMessage(LoggingService.LEVELS.WARN, message, data);
    this.storeLog(entry);
    this.logToConsole(LoggingService.LEVELS.WARN, message, data);
  }

  /**
   * Error level logging
   */
  error(message, error = null, data = {}) {
    const errorData = {
      ...data,
      errorMessage: error?.message,
      errorStack: error?.stack,
    };

    const entry = this.formatMessage(LoggingService.LEVELS.ERROR, message, errorData);
    this.storeLog(entry);
    this.logToConsole(LoggingService.LEVELS.ERROR, message, errorData);
    this.sendToServer(entry);
  }

  /**
   * Fatal error logging
   */
  fatal(message, error = null, data = {}) {
    const errorData = {
      ...data,
      errorMessage: error?.message,
      errorStack: error?.stack,
    };

    const entry = this.formatMessage(LoggingService.LEVELS.FATAL, message, errorData);
    this.storeLog(entry);
    this.logToConsole(LoggingService.LEVELS.FATAL, message, errorData);
    this.sendToServer(entry);
  }

  /**
   * Log API call
   */
  logAPICall(method, url, status, duration, data = {}) {
    this.info(`API: ${method} ${url}`, {
      status,
      duration: `${duration}ms`,
      ...data,
    });
  }

  /**
   * Log socket event
   */
  logSocketEvent(event, data = {}) {
    this.debug(`Socket: ${event}`, data);
  }

  /**
   * Log user action
   */
  logUserAction(action, data = {}) {
    this.info(`User: ${action}`, data);
  }

  /**
   * Get all logs
   */
  getLogs(filter = {}) {
    const { level, message, limit = 100 } = filter;

    let filtered = this.logs;

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    if (message) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(message.toLowerCase())
      );
    }

    return filtered.slice(-limit);
  }

  /**
   * Export logs as JSON
   */
  exportLogs() {
    const dataStr = JSON.stringify(this.logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    localStorage.setItem('enable_logs', enabled);
  }
}

export default new LoggingService();
