let buffer: Buffer = Buffer.from("41424344", "hex");
const owner: any = buffer;
console.log("identity", owner === buffer, buffer.valueOf() === owner, buffer.toLocaleString === buffer.toString);
console.log("text", buffer.toString(), buffer.toLocaleString("hex", 1, 3), "value=" + buffer);
for (let iteration = 0; iteration < 2; ++iteration) {
    const local: Buffer = Buffer.from("7ffc000000000001", "hex");
    console.log("local", local.length, typeof local.readDoubleBE(), Number.isNaN(local.readDoubleBE()));
}
const view: Buffer = buffer.slice(1, 3);
view.writeUInt8(90);
console.log("view", view !== buffer, view.toString(), buffer.toString());
console.log("bytes", buffer.readUInt16BE(), buffer.writeInt16LE(-2), buffer.toString("hex"), buffer.readInt16LE());
buffer[0] = 258;
buffer[1] = -1;
console.log("index", buffer[0], buffer[1], buffer[.5], buffer[99]);
const symbol: any = Symbol("extra");
Reflect.set(buffer, symbol, "symbol-value");
Object.defineProperty(buffer, "extra", { value: "hidden", configurable: true });
console.log("keys", Object.keys(buffer).join(","), Object.getOwnPropertyNames(buffer).join(","), Reflect.ownKeys(buffer).length);
console.log("reflection", Reflect.get(buffer, symbol), Reflect.has(buffer, "readUInt8"), "readUInt8" in buffer, Object.hasOwn(buffer, "readUInt8"));
const byteDescriptor: any = Object.getOwnPropertyDescriptor(buffer, "0");
console.log("descriptor", byteDescriptor.value, byteDescriptor.writable, byteDescriptor.enumerable, byteDescriptor.configurable, Reflect.deleteProperty(buffer, "0"));
const prototype: any = Object.getPrototypeOf(buffer);
const descriptor: any = Object.getOwnPropertyDescriptor(prototype, "readUInt8");
let trace = "";
function mark(label: string): number { trace += label; return 0; }
try {
    Object.defineProperty(prototype, "readUInt8", { configurable: true, get: function(this: any): any {
        trace += "G";
        return function(this: any, ...args: any[]): any { trace += "C"; return { receiver: this, args }; };
    } });
    const result: any = buffer.readUInt8(mark("A"), mark("B"));
    console.log("lookup", trace, result.receiver === owner, result.args.length);
} finally { Object.defineProperty(prototype, "readUInt8", descriptor); }
for (const offset of [.5, -1, NaN, Infinity]) {
    try { buffer.readUInt8(offset); } catch (error) { console.log("range", error instanceof RangeError); }
}
try { (buffer as any).readUInt8("0"); } catch (error) { console.log("type", error instanceof TypeError); }
try { buffer.writeUInt8(256); } catch (error) { console.log("value", error instanceof RangeError); }
const subarray: any = Object.getOwnPropertyDescriptor(prototype, "subarray");
try {
    Object.defineProperty(prototype, "subarray", { configurable: true, value: function(): any { return "override"; } });
    console.log("slice lookup", buffer.slice(0, 1));
} finally { Object.defineProperty(prototype, "subarray", subarray); }
console.log("aliases", buffer.readUint8 === buffer.readUInt8, buffer.writeUint32BE === buffer.writeUInt32BE);
const iterator: any = buffer.values();
console.log("iterator", iterator.next().value, iterator.next().value, Array.from(buffer).length);
