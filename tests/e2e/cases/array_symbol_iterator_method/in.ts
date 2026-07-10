const source: any = ["a", "b"];
const method: any = source[Symbol.iterator];
const values: any = Reflect.apply(method, source, []);
const protoMethod: any = Array.prototype[Symbol.iterator];
const protoValues: any = Reflect.apply(protoMethod, source, []);

console.log("method:", typeof method, values.length, values[0], values[1]);
console.log("proto:", typeof protoMethod, protoValues.length, protoValues[0], protoValues[1]);
const proto: any = Array.prototype;
console.log("identity:", method === source.values, protoMethod === proto.values, protoMethod.name);
try {
    method();
} catch (err: any) {
    console.log("missing receiver:", err);
}
