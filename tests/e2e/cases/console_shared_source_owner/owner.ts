import originalConsole, {log as originalLog} from "node:console";
export const owner = originalConsole;
export const log = originalLog;
export function emit(...values: unknown[]): void { Reflect.apply(log, owner, values); }
export async function resumed(value: string): Promise<void> { const retained = log; await Promise.resolve(); Reflect.apply(retained, owner, ["resumed:", value]); }
