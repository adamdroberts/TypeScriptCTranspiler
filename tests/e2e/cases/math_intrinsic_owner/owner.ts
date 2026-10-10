export function random(): number { return Math.random(); }
export async function delayed(value: unknown): Promise<number> { return Math.random(await Promise.resolve(value)); }
