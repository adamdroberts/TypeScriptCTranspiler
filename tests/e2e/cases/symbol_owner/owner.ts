export function create(value: unknown): symbol { return Symbol(value); }
export function registered(value: unknown): symbol { return Symbol.for(value); }
export function registryKey(value: unknown): string | undefined { return Symbol.keyFor(value); }
export async function delayed(value: unknown): Promise<symbol> { return Symbol(await Promise.resolve(value)); }
export function show(value: symbol): string { return value.toString(); }
