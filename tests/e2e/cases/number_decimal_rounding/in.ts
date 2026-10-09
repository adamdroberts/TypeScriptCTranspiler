console.log("ties:", (1.125).toFixed(2), (-1.125).toFixed(2), (1.005).toFixed(2));
console.log("integer:", (1000000000000000128).toFixed(0));
console.log("carry:", (9.5).toPrecision(1), (99.5).toExponential(1));
console.log("shortest:", (0.1).toExponential(), Number.MIN_VALUE.toExponential());
console.log("zero:", (-0).toFixed(2), (-0.0001).toFixed(2), (0).toPrecision(3));
console.log("threshold:", (1e-6).toPrecision(2), (1e-7).toPrecision(2), (1e21).toFixed(2));
console.log("wide:", (0.1).toPrecision(100));

let trace = "";
const digits: any = { [Symbol.toPrimitive]: function(hint: string): number { trace += hint; return 2; } };
console.log("coercion:", (1.125).toFixed(digits), trace);
const wrapper: Number = new Number(-1.125);
console.log("wrapper:", wrapper.toPrecision(digits));
const marker: any = { tag: "payload" };
const poison: any = { valueOf: function(): any { throw marker; } };
try { (NaN).toPrecision(poison); } catch (error) { console.log("poison:", error === marker); }
try { (NaN).toFixed(101); } catch (error) { console.log("fixed range:", error instanceof RangeError); }
console.log("nonfinite:", (NaN).toExponential(101), (Infinity).toPrecision(0));
const method: any = (1.125).toFixed;
trace = "";
try { Reflect.apply(method, {}, [digits]); } catch (error) { console.log("receiver:", error instanceof TypeError, trace === ""); }
console.log("metadata:", method === Number.prototype.toFixed, method.name, method.length);

const prototype: any = Number.prototype;
const original: any = Object.getOwnPropertyDescriptor(prototype, "toFixed");
try {
    Object.defineProperty(prototype, "toFixed", { configurable: true, get: function(this: any): any {
        trace += "G";
        return function(this: any, ...args: any[]): any { trace += "C"; return { receiver: this, args }; };
    } });
    function mark(label: string): number { trace += label; return 2; }
    trace = "";
    const value: number = 1.125;
    const result: any = value.toFixed(mark("A"), mark("B"));
    console.log("lookup:", trace, result.receiver === value, result.args.length);
    Object.defineProperty(prototype, "toFixed", { configurable: true, value: null });
    trace = "";
    const skipped: any = value.toFixed?.(mark("never"));
    console.log("optional:", skipped === undefined, trace === "");
} finally { Object.defineProperty(prototype, "toFixed", original); }
