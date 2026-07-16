type LogLevel = "info" | "warn" | "error";

export interface LogContext {
  event: string;
  requestId?: string;
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, context: LogContext): void {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...context
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(entry));
    return;
  }

  console.log(JSON.stringify(entry));
}

export const logger = {
  info(message: string, context: LogContext): void {
    write("info", message, context);
  },
  warn(message: string, context: LogContext): void {
    write("warn", message, context);
  },
  error(message: string, context: LogContext): void {
    write("error", message, context);
  }
};
