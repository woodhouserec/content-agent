export function createId(prefix: string): string {
  const cryptoId = crypto.randomUUID().replaceAll("-", "");
  return `${prefix}_${cryptoId}`;
}
