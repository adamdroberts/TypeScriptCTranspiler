const proto: any = Array.prototype;

const receiver: any = { 0: "a", length: 1, label: "recv" };
const zero: any = Reflect.apply(proto.concat, receiver, []);
console.log("zero:", zero.length, zero[0].label, zero[0][0], zero[0].length);

const mixed: any = Reflect.apply(proto.concat, receiver, [["x", "y"], { 0: "z", length: 1, label: "arg" }, "tail"]);
console.log("mixed:", mixed.length, mixed[0].label, mixed[1], mixed[2], mixed[3].label, mixed[4]);

const arr: any = [1, 2];
const copy: any = Reflect.apply(proto.concat, arr, []);
console.log("array:", copy.join("|"), copy === arr);

const proxyReceiver: any = new Proxy(["p", "q"], {});
const proxyArg: any = new Proxy(["r", "s"], {});
const proxyConcat: any = Reflect.apply(proto.concat, proxyReceiver, [proxyArg, "tail"]);
console.log("proxy:", proxyConcat.join("|"), proxyConcat.length);

const spreadableReceiver: any = { 0: "sr-a", 1: "sr-b", length: 2 };
Object.defineProperty(spreadableReceiver, Symbol.isConcatSpreadable as any, { value: true });
const spreadableReceiverConcat: any = Reflect.apply(proto.concat, spreadableReceiver, []);
console.log("spreadable receiver:", spreadableReceiverConcat.join("|"), spreadableReceiverConcat.length, Object.keys(spreadableReceiverConcat).join("|"));

const spreadableArg: any = { 0: "arg-a", 1: "arg-b", length: 2 };
Reflect.defineProperty(spreadableArg, Symbol.isConcatSpreadable as any, { value: true });
const spreadableArgConcat: any = Reflect.apply(proto.concat, ["head"], [spreadableArg, "tail"]);
console.log("spreadable arg:", spreadableArgConcat.join("|"), spreadableArgConcat.length);

const blockedArray: any = ["ba", "bb"];
Object.defineProperty(blockedArray, Symbol.isConcatSpreadable as any, { value: false });
const blockedArrayConcat: any = Reflect.apply(proto.concat, blockedArray, ["tail"]);
console.log("blocked array:", blockedArrayConcat.length, Array.isArray(blockedArrayConcat[0]), blockedArrayConcat[0].join("|"), blockedArrayConcat[1]);
