const nums: any = [4, 5, 6];

const keys = Object.keys(nums);
const values = Object.values(nums);
const entries: any = Object.entries(nums);
const own = Reflect.ownKeys(nums);
const names = Object.getOwnPropertyNames(nums);

console.log("keys:", keys.join("|"));
console.log("values:", values.join("|"));
console.log("entry0:", entries[0][0], entries[0][1]);
console.log("entry2:", entries[2][0], entries[2][1]);
console.log("own:", own.join("|"));
console.log("names:", names.join("|"));
console.log(
    "checks:",
    Object.hasOwn(nums, "1"),
    nums.hasOwnProperty("length"),
    nums.propertyIsEnumerable("length"),
    Reflect.has(nums, "2"),
);
console.log("reflect get:", Reflect.get(nums, "1"), Reflect.get(nums, "length"));

const firstDesc: any = Object.getOwnPropertyDescriptor(nums, "0");
const lengthDesc: any = Reflect.getOwnPropertyDescriptor(nums, "length");
const all: any = Object.getOwnPropertyDescriptors(nums);

console.log(
    "first desc:",
    firstDesc.value,
    firstDesc.writable,
    firstDesc.enumerable,
    firstDesc.configurable,
);
console.log(
    "length desc:",
    lengthDesc.value,
    lengthDesc.writable,
    lengthDesc.enumerable,
    lengthDesc.configurable,
);
console.log("all desc:", all["2"].value, all["length"].value);
