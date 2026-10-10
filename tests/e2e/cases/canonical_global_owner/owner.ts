export function parse(value: unknown): unknown { return JSON.parse(value); }
export function error(value: unknown): Error { return Error(value); }
export function map(value: unknown): Map<unknown, unknown> { return new Map(value); }
export function uri(value: unknown): string { return encodeURI(value); }
export async function delayed(value: unknown): Promise<Error> { return new Error(await Promise.resolve(value)); }
