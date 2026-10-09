const method: any = Object.getOwnPropertyDescriptors;
console.log("method", typeof method, method.name, method.length, Object.getPrototypeOf(method) === Function.prototype);
const text: any = Object.getOwnPropertyDescriptors("A\ud83d\ude00\u0000");
console.log("string", Object.keys(text).join(","), text.length.value, text.length.writable, text.length.enumerable, text.length.configurable);
console.log("units", text[1].value.charCodeAt(0), text[2].value.charCodeAt(0), text[3].value.charCodeAt(0));
const numbers: number[] = [1.25, -0, NaN];
const array: any = Object.getOwnPropertyDescriptors(numbers);
console.log("array", array.length.value, array[0].value, Object.is(array[1].value, -0), Number.isNaN(array[2].value));
const object: any = {};
const symbol: any = Symbol("own");
object[symbol] = "symbol"; object.tail = "tail"; object[23] = "index"; object[1] = "first";
Object.defineProperty(object, "hidden", { value: "hidden" });
const all: any = Object.getOwnPropertyDescriptors(object);
console.log("keys", Object.keys(all).join(","), Reflect.ownKeys(all)[4] === symbol, all[symbol].value, all.hidden.enumerable);
let trace = "";
const target: any = { a: 1, b: 2 };
const proxy: any = new Proxy(target, {
    ownKeys: function(): any[] { trace += "K"; return ["b", "a"]; },
    getOwnPropertyDescriptor: function(_owner: any, key: string): any { trace += key; return { value: target[key], configurable: true }; }
});
const reflected: any = Object.getOwnPropertyDescriptors(proxy);
console.log("proxy", trace, Object.keys(reflected).join(","), reflected.b.value, reflected.b.writable, reflected.b.enumerable);
const marker: any = {};
interface Fields { length: any; value: any; }
const fields: Fields = { length: marker, value: "initial" };
const owner: any = fields;
const descriptors: any = Object.getOwnPropertyDescriptors(fields);
fields.value = "live";
console.log("fields", descriptors.length.value === marker, descriptors.value.value, method(owner).value.value, "get" in descriptors.value);
const descriptor: any = Object.getOwnPropertyDescriptor(Object, "getOwnPropertyDescriptors");
try {
    Object.defineProperty(Object, "getOwnPropertyDescriptors", { configurable: true, get: function(): any {
        trace += "G"; return function(this: any, ...args: any[]): any { trace += "C"; return { receiver: this, args }; };
    } });
    trace = "";
    function mark(label: string): number { trace += label; return 1; }
    const result: any = Object.getOwnPropertyDescriptors(mark("A"), ...[mark("B"), mark("D")]);
    console.log("lookup", trace, result.receiver === Object, result.args.length);
} finally { Object.defineProperty(Object, "getOwnPropertyDescriptors", descriptor); }
for (const value of [null, undefined]) {
    try { Object.getOwnPropertyDescriptors(value); console.log("nullish", false); }
    catch (error) { console.log("nullish", error instanceof TypeError); }
}
