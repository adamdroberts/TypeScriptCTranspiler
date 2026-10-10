export function create(value: unknown): unknown[] { return Array(value); }
export function construct(value: unknown): unknown[] { return new Array(value); }
export function of(value: unknown): unknown[] { return Array.of(value); }
export async function delayed(value: unknown): Promise<unknown[]> { return Array(await Promise.resolve(value)); }
export async function delayedNew(value: unknown): Promise<unknown[]> { return new Array(await Promise.resolve(value)); }
