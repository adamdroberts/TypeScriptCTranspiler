interface Point {
    name: string;
    count: number;
}

function ignored(label: string): string {
    console.log("ignored:", label);
    return label;
}

const point: Point = { name: "Ada", count: 1 };
const samePoint: Point = Object.prototype.valueOf.call(point, ignored("typed"));
samePoint.count = samePoint.count + 1;

const dynamic: any = { label: "dyn" };
const sameDynamic: any = Object.prototype.valueOf.call(dynamic, ignored("dynamic"));
sameDynamic.extra = 7;

const dynamicNums: any = [5, 6];
const sameDynamicNums: any = Object.prototype.valueOf.call(dynamicNums);
sameDynamicNums.push(7);

const nums = [1, 2];
const sameNums: number[] = Object.prototype.valueOf.call(nums);
sameNums.push(3);

const text: any = "hi";
const num: any = 41;
const flag: any = true;

console.log("typed:", point.name, point.count);
console.log("dynamic:", dynamic.label, dynamic.extra);
console.log("dynamic-array:", dynamicNums.length, dynamicNums[2]);
console.log("typed-array:", nums.length, nums[2]);
console.log(
    "primitives:",
    Object.prototype.valueOf.call(text) + "!",
    Object.prototype.valueOf.call(num) + 1,
    Object.prototype.valueOf.call(flag) ? "yes" : "no",
);
