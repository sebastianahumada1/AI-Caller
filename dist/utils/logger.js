export class Logger {
    static formatMessage(level, message, context) {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` ${JSON.stringify(context)}` : '';
        return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
    }
    static info(message, context) {
        console.log(this.formatMessage('info', message, context));
    }
    static warn(message, context) {
        console.warn(this.formatMessage('warn', message, context));
    }
    static error(message, context) {
        console.error(this.formatMessage('error', message, context));
    }
    static debug(message, context) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(this.formatMessage('debug', message, context));
        }
    }
}
// Request logging middleware helper
export function logRequest(method, url, statusCode, duration) {
    Logger.info('HTTP Request', {
        method,
        url,
        statusCode,
        duration: `${duration}ms`
    });
}
