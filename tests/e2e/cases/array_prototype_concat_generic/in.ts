const proto: any = Array.prototype;

const receiver: any = { 0: "a", length: 1, label: "recv" };
const zero: any = Reflect.apply(proto.concat, receiver, []);
console.log("zero:", zero.length, zero[0].label, zero[0][0], zero[0].length);

const mixed: any = Reflect.apply(proto.concat, receiver, [["x", "y"], { 0: "z", length: 1, label: "arg" }, "tail"]);
console.log("mixed:", mixed.length, mixed[0].label, mixed[1], mixed[2], mixed[3].label, mixed[4]);

const arr: any = [1, 2];
const copy: any = Reflect.apply(proto.concat, arr, []);
console.log("array:", copy.join("|"), copy === arr);
