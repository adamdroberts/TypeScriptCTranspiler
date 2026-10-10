const date = new Date(Date.UTC(2000, 0, 1));
const input: any = {valueOf() {date.setTime(0); return 1;}};
console.log("snapshot", date.setUTCHours(input), date.getTime());
const invalid = new Date(NaN);
const changed: any = {valueOf() {invalid.setTime(0); return 1;}};
console.log("invalid", Number.isNaN(invalid.setUTCHours(changed)), invalid.getTime());
const original = Object.getOwnPropertyDescriptor(Date.prototype, "getTime")!;
const events: string[] = [];
Object.defineProperty(Date.prototype, "getTime", {get() {events.push("get"); return function(this: any, value: number) {events.push("call"); return this === date ? value : -1;};}, configurable: true});
function replace(): number {events.push("arg"); Object.defineProperty(Date.prototype, "getTime", {value: () => -1, writable: true, configurable: true}); return 42;}
console.log("lookup", date.getTime(replace()), events.join("|"));
Object.defineProperty(Date.prototype, "getTime", original);
const exact = new Date(0);
console.log("order", exact.setUTCHours(80063993375, 29, 1, -288230376151711740));
exact.setTime(0);
console.log("truncate", exact.setUTCSeconds(-1, 999.9));
Object.defineProperty(Date.prototype, "getTime", {value: () => "boxed", writable: true, configurable: true});
const observed = date.getTime();
console.log("result", typeof observed, observed);
const alias = observed;
const captured = (): any => alias;
console.log("alias", typeof alias, alias, captured());
Object.defineProperty(Date.prototype, "getTime", original);
date.setTime(Date.UTC(2000, 0, 1));
const retained: any = date.setUTCHours;
console.log("retained", retained.call(date, input));
date.setTime(Date.UTC(2000, 0, 1));
async function suspended(): Promise<number> {return date.setUTCHours(await Promise.resolve(input));}
suspended().then((value: number) => console.log("suspended", value));
