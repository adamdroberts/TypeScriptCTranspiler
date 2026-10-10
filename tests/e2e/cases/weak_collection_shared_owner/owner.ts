export const store = new WeakMap<object, string>();
export const seen = new WeakSet<object>();
export const MapOwner = WeakMap;
export function remember(key: object, label: string): void { store.set(key, label); seen.add(key); }
export async function resumed(key: object): Promise<string> { const get = store.get; await Promise.resolve(); return Reflect.apply(get, store, [key]) as string; }
