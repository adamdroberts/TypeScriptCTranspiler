export function numeric(value: unknown): number { return Number(value); }
export function textual(value: unknown): string { return String(value); }
export function boolean(value: unknown): boolean { return Boolean(value); }
export function wrapper(value: unknown): String { return new String(value); }
export async function delayed(value: unknown): Promise<String> { return new String(await Promise.resolve(value)); }
