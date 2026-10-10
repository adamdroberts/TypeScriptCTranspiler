export function sum(items: Iterable<number>): number { return Math.sumPrecise(items); }
export async function delayed(items: Iterable<number>): Promise<number> { return Math.sumPrecise(await Promise.resolve(items)); }
