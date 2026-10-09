const first: symbol = Symbol("before-prototype");
console.log("symbol first:", first.description);
const poison: any = { [Symbol.toPrimitive]: function(): any { throw "unexpected option coercion"; } };
console.log("fallback:", (1234.5).toLocaleString(poison, poison), (1234n).toLocaleString(poison, poison));
console.log("methods:", (1n).toLocaleString === BigInt.prototype.toLocaleString, true.toLocaleString === Object.prototype.toLocaleString);
for (const prototype of [BigInt.prototype, Symbol.prototype]) {
    try { Reflect.apply(prototype.valueOf, prototype, []); }
    catch (error) { console.log("brand:", error instanceof TypeError); }
}

let trace = "";
const payload: any = { tag: "retained" };
const receiver: any = {};
Object.defineProperty(receiver, "toString", { get: function(this: any): any {
    trace += "G";
    return function(this: any, ...args: any[]): any {
        trace += "C";
        if (this !== receiver || args.length !== 0) throw payload;
        return payload;
    };
} });
console.log("object:", Object.prototype.toLocaleString.call(receiver, poison) === payload, trace);
const bad: any = { toString: null, valueOf: function(): string { throw "unexpected fallback"; } };
try { Reflect.apply(Object.prototype.toLocaleString, bad, []); }
catch (error) { console.log("noncallable:", error instanceof TypeError); }

trace = "";
const inherited: any = { 0: { toLocaleString: function(...args: any[]): string { trace += "I"; return "first:" + args.length; } } };
const array: any = Object.create(inherited);
Object.defineProperty(array, "length", { get: function(): any {
    trace += "L";
    return { valueOf: function(): number { trace += "V"; return 3; } };
} });
Object.defineProperty(array, "1", { get: function(): any {
    trace += "G"; delete array[2];
    return { toLocaleString: function(...args: any[]): any {
        trace += "C";
        if (args.length !== 0) throw payload;
        return { [Symbol.toPrimitive]: function(hint: string): string { trace += hint; return "middle"; } };
    } };
} });
array[2] = { toLocaleString: function(): any { throw payload; } };
console.log("array:", Reflect.apply(Array.prototype.toLocaleString, array, [poison, poison]), trace);

const prototype: any = Number.prototype;
const original: any = Object.getOwnPropertyDescriptor(prototype, "toLocaleString");
try {
    Object.defineProperty(prototype, "toLocaleString", { configurable: true, get: function(): any {
        trace += "G";
        return function(this: any, ...args: any[]): any { trace += "C"; return { receiver: this, args }; };
    } });
    function mark(label: string): number { trace += label; return 2; }
    const value: number = 7;
    trace = "";
    const result: any = value.toLocaleString(mark("A"), mark("B"), mark("D"));
    console.log("lookup:", trace, result.receiver === value, result.args.length);
    trace = "";
    value.toLocaleString();
    console.log("unused:", trace);
} finally { Object.defineProperty(prototype, "toLocaleString", original); }
