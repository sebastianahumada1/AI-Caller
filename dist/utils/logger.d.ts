export interface LogContext {
    [key: string]: any;
}
export declare class Logger {
    private static formatMessage;
    static info(message: string, context?: LogContext): void;
    static warn(message: string, context?: LogContext): void;
    static error(message: string, context?: LogContext): void;
    static debug(message: string, context?: LogContext): void;
}
export declare function logRequest(method: string, url: string, statusCode: number, duration: number): void;
