import type { D1Database } from "../domain/runtime";

export interface HealthCheckResult {
  available: boolean;
  value: number | null;
}

export async function checkD1(db: D1Database): Promise<HealthCheckResult> {
  const row = await db.prepare("SELECT 1 AS value").first<{ value: number }>();
  return {
    available: row?.value === 1,
    value: row?.value ?? null
  };
}
