let trace = "";
const radix: any = { valueOf(): number { trace += "V"; return 16; } };
console.log("coercion", (255).toString(radix), trace);
const marker: any = { tag: "payload" };
const poisoned: any = { [Symbol.toPrimitive](): any { throw marker; } };
try { (0).toString(poisoned); } catch (error) { console.log("poison", error === marker); }
const prototype: any = Number.prototype;
const original: any = Object.getOwnPropertyDescriptor(prototype, "toString");
const method: any = (1).toString;
console.log("method", method === prototype.toString, method.name, method.length);
function mark(label: string): number { trace += label; return 16; }
try {
    Object.defineProperty(prototype, "toString", { configurable: true, get: function(): any {
        trace += "G";
        return function(this: any, radix: any, ...extra: any[]): any {
            trace += "C"; return { receiver: this, count: extra.length, first: extra[0], last: extra[extra.length - 1] };
        };
    } });
    trace = "";
    const result: any = (255).toString(mark("A"), mark("B"), mark("C"));
    console.log("lookup", trace, result.receiver, result.count, result.first, result.last);
    Object.defineProperty(prototype, "toString", { configurable: true, value: null });
    trace = "";
    console.log("optional", (255).toString?.(mark("X")) === undefined, trace === "");
    const absent: any = undefined;
    console.log("value-optional", absent?.(mark("X")) === undefined, trace === "");
} finally { Object.defineProperty(prototype, "toString", original); }
