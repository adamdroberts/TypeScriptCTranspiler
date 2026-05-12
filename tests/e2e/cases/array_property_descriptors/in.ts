const nums = [4, 5];

const first: any = Object.getOwnPropertyDescriptor(nums, "0");
const lengthDesc: any = Object.getOwnPropertyDescriptor(nums, "length");
const missing: any = Object.getOwnPropertyDescriptor(nums, "2");
const reflect: any = Reflect.getOwnPropertyDescriptor(nums, "1");
const all: any = Object.getOwnPropertyDescriptors(nums);

console.log("first:", first.value, first.writable, first.enumerable, first.configurable);
console.log("length:", lengthDesc.value, lengthDesc.writable, lengthDesc.enumerable, lengthDesc.configurable);
console.log("missing:", missing);
console.log("reflect:", reflect.value, reflect.enumerable);
console.log("keys:", Object.keys(all).join("|"));
console.log("all:", all["0"].value, all["1"].value, all["length"].value);
