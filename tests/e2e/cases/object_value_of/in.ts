const obj: any = { label: "kept" };
const same: any = obj.valueOf();
const num: any = 41;
const text: any = "hi";

console.log("same:", Object.is(same, obj), same.label);
console.log("num:", num.valueOf() + 1);
console.log("text:", text.valueOf() + "!");

obj.valueOf = function () {
    return "own:" + obj.label;
};
console.log("own object:", obj.valueOf(), Reflect.apply(obj.valueOf, obj, []));

obj.valueOf = 7;
try {
    console.log(obj.valueOf());
} catch (e) {
    console.log("bad object:", e);
}

const bare: any = Object.create(null);
try {
    console.log(bare.valueOf());
} catch (e) {
    console.log("bare object:", e);
}
