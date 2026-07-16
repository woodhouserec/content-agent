export interface Env {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  ALLOWED_TELEGRAM_USER_ID: string;
  SETUP_SECRET: string;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
}

export interface ScheduledController {
  scheduledTime: number;
  cron: string;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump?(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: Record<string, unknown>;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}
