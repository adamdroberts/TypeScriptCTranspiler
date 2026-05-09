const obj: any = { label: "kept" };
const same: any = obj.valueOf();
const num: any = 41;
const text: any = "hi";

console.log("same:", Object.is(same, obj), same.label);
console.log("num:", num.valueOf() + 1);
console.log("text:", text.valueOf() + "!");
