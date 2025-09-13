export interface LogContext {
  [key: string]: any;
}

export class Logger {
  private static formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  static info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  static warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  static error(message: string, context?: LogContext): void {
    console.error(this.formatMessage('error', message, context));
  }

  static debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }
}

// Request logging middleware helper
export function logRequest(method: string, url: string, statusCode: number, duration: number): void {
  Logger.info('HTTP Request', {
    method,
    url,
    statusCode,
    duration: `${duration}ms`
  });
}

