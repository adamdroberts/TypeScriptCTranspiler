const constructor: any = Number;
const method: any = Number.isFinite;
console.log("ordinary:", method === constructor.isFinite, method.name, method.length, !("prototype" in method));
console.log("missing:", Number.isFinite(), Number.isInteger(), Number.isNaN(), Number.isSafeInteger(),
    Number.isNaN(Number.parseInt()), Number.isNaN(Number.parseFloat()));
console.log("aliases:", Number.parseInt === parseInt, Number.parseFloat === parseFloat);
console.log("constants:", constructor.MAX_SAFE_INTEGER, constructor.MIN_SAFE_INTEGER,
    constructor.MIN_VALUE === 2 ** -1074, constructor.MAX_VALUE === (2 - 2 ** -52) * 2 ** 1023);
const constant: any = Object.getOwnPropertyDescriptor(constructor, "EPSILON");
const prototype: any = Object.getOwnPropertyDescriptor(constructor, "prototype");
console.log("descriptors:", constant.writable, constant.enumerable, constant.configurable,
    prototype.writable, prototype.enumerable, prototype.configurable);
const marker: any = { tag: "payload" };
const poison: any = { [Symbol.toPrimitive]: function(): any { throw marker; } };
console.log("no conversion:", Number.isFinite(poison), Number.isInteger(poison), Number.isNaN(poison), Number.isSafeInteger(poison));
let trace = "";
function mark(label: string): number { trace += label; return 16; }
const input: any = { toString: function(): string { trace += "S"; return "ff"; } };
const radix: any = { [Symbol.toPrimitive]: function(hint: string): number { trace += hint; return 16; } };
console.log("parse:", Number.parseInt(input, radix, mark("A"), mark("B")), trace);
const original: any = Object.getOwnPropertyDescriptor(constructor, "isFinite");
try {
    Object.defineProperty(constructor, "isFinite", { configurable: true, get: function(this: any): any {
        trace += "G";
        return function(this: any, ...args: any[]): any { trace += "C"; return { receiver: this, args }; };
    } });
    trace = "";
    const result: any = Number.isFinite(mark("A"), mark("B"));
    console.log("lookup:", trace, result.receiver === constructor, result.args.length);
    trace = "";
    Number.isFinite(1);
    console.log("unused:", trace);
    Object.defineProperty(constructor, "isFinite", { configurable: true, value: null });
    trace = "";
    const skipped: any = Number.isFinite?.(mark("never"));
    console.log("optional:", trace === "", skipped === undefined);
} finally { Object.defineProperty(constructor, "isFinite", original); }
function shadow(Number: any): any { return Number.isFinite(Number.MAX_VALUE); }
console.log("shadow:", shadow({ MAX_VALUE: marker, isFinite: function(value: any): boolean { return value === marker; } }));
const payloadBytes = Buffer.from([0x7f, 0xfc, 0, 0, 0, 0, 0, 1]);
const payload: any = payloadBytes.readDoubleBE(0);
console.log("native NaN:", typeof payload, Number.isNaN(payload), Number.isFinite(payload), Object.is(payload, NaN));
