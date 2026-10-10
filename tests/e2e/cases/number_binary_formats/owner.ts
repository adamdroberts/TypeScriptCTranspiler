export function half(value: number): number { return Math.f16round(value); }
export function single(value: number): number { return Math.fround(value); }
export async function delayed(value: number): Promise<number> { return Math.f16round(await Promise.resolve(value)); }
