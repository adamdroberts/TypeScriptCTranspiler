const utc: any = Date.UTC;
console.log("default", Date.UTC(1971), utc(1971), utc.call({}, 1971), Number.isNaN(utc(1971, undefined)));
const events: string[] = [];
const year: any = {valueOf() {events.push("year"); return 1971;}};
function month(): any {events.push("argument"); return {valueOf() {events.push("month"); return 0;}};}
console.log("ordered", Date.UTC(year, month()), events.join("|"));
const descriptor = Object.getOwnPropertyDescriptor(Date, "UTC")!;
Object.defineProperty(Date, "UTC", {get() {events.push("get"); return function(this: any, value: number) {events.push("call"); return this === Date ? value : 0;};}, configurable: true});
events.length = 0;
function replace(): number {events.push("argument"); Object.defineProperty(Date, "UTC", {value: () => -1, writable: true, configurable: true}); return 42;}
console.log("saved", Date.UTC(replace()), events.join("|"));
Object.defineProperty(Date, "UTC", descriptor);
function defaulted(value = Date.UTC(1971, 0, 1, 0, 0, 1, 2, 3)): number {return value;}
console.log("formal", defaulted());
const holder: any = {UTC(value: number) {return value + 1;}};
function shadowed(Date: any): number {return Date.UTC(41);}
console.log("shadow", shadowed(holder));
async function awaited(): Promise<number> {return Date.UTC(await Promise.resolve(1971));}
awaited().then((value: number) => console.log("awaited", value));
