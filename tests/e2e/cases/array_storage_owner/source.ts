export const marker: any = { token: 23 };
export const maximum = 4294967295;
export const source: number[] = new Array(maximum);
Reflect.set(source, String(maximum - 1), marker);
Reflect.set(source, '4000', marker);
export function tail(): any[] { return source.slice(maximum - 2); }
export const blocked: number[] = [1, 2, 3];
Object.defineProperty(blocked, '1', { configurable: false });
