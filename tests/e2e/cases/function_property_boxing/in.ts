const owner: any = {};
let calls = 0;
owner[Symbol.iterator] = function(value: number): number { calls += value; return calls; };
owner.arrow = (value: number): number => { calls += value; return calls; };
console.log(typeof owner[Symbol.iterator], owner[Symbol.iterator](3), owner.arrow(4));
function nullable(present: boolean): (() => number) | null { return present ? () => 11 : null; }
function optional(present: boolean): (() => number) | undefined { return present ? () => 13 : undefined; }
const absentNull: any = nullable(false), absentUndefined: any = optional(false);
const presentNull: any = nullable(true), presentUndefined: any = optional(true);
console.log(absentNull === null, absentUndefined === undefined, presentNull(), presentUndefined());
console.log((nullable(false) ?? (() => 17))(), (optional(false) ?? (() => 19))());
let trace = "";
const protocol: any = {};
const callback: any = function(this: any, ...values: any[]): string { trace += "call|"; return (this === protocol) + ":" + values.join(","); };
Object.defineProperty(protocol, Symbol.iterator, { get() {
    trace += "get|";
    return callback;
} });
function argument(): number { trace += "arg|"; return 2; }
console.log(protocol[Symbol.iterator](argument(), ...[3, 4]), trace);
