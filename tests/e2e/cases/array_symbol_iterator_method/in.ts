const source: any = ["a", "b"];
const method: any = source[Symbol.iterator];
const values: any = Reflect.apply(method, source, []);
const protoMethod: any = Array.prototype[Symbol.iterator];
const protoValues: any = Reflect.apply(protoMethod, source, []);

console.log("method:", typeof method, values.length, values[0], values[1]);
console.log("proto:", typeof protoMethod, protoValues.length, protoValues[0], protoValues[1]);
const protoValuesMethod: any = Array.prototype.values;
const protoMapMethod: any = Array.prototype.map;
const mapped: any = Reflect.apply(protoMapMethod, source, [(value: string) => value.toUpperCase()]);
console.log("identity:", method === source.values, protoMethod === protoValuesMethod, protoMethod.name);
console.log("named:", protoMapMethod.name, protoMapMethod.length, mapped.join("|"));
const plain: any = {};
const plainMethod: any = plain[Symbol.iterator];
const typedMethod: any = (["x"] as string[])[Symbol.iterator];
console.log("plain:", plainMethod === undefined, typeof typedMethod);
try {
    method();
} catch (err: any) {
    console.log("missing receiver:", err);
}
