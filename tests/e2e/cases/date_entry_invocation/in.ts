const descriptor = Object.getOwnPropertyDescriptor(globalThis, "Date")!;
const initial = Date, events: string[] = [];
const replacement: any = function(value: any): any {events.push("invoke:" + value); return {value};};
function install(): void {events.length = 0; Object.defineProperty(globalThis, "Date", {get() {events.push("get"); return replacement;}, configurable: true});}
function argument(): any {events.push("arg"); Object.defineProperty(globalThis, "Date", {value: () => {throw new Error("reread");}, writable: true, configurable: true}); return "input";}
install();
const called = Date(argument()), alias = called;
console.log("plain", typeof called, (alias as any).value, events.join("|"));
install();
const constructed = new Date(argument());
console.log("construct", typeof constructed, (constructed as any).value, events.join("|"));
let observed = 0;
Object.defineProperty(globalThis, "Date", {value: function(): any {observed++; return {};}, writable: true, configurable: true});
const unused = Date();
const unusedNew = new Date();
console.log("unused", observed);
Object.defineProperty(globalThis, "Date", descriptor);
events.length = 0;
function component(name: string, value: number): any {events.push("arg:" + name); return {valueOf() {events.push("number:" + name); return value;}};}
console.log("components", new initial(component("year", 2000), component("month", 0)).getTime(), events.join("|"));
install();
async function suspended(): Promise<any> {return new Date(await Promise.resolve(argument()));}
suspended().then((value: any) => {console.log("suspended", value.value, events.join("|")); Object.defineProperty(globalThis, "Date", descriptor);});
