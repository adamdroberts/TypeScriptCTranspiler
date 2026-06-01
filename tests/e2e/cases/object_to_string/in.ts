const obj: any = { label: "x" };
const arr: any = [1, 2];
const num: any = 12.5;
const text: any = "hello";
const flag: any = true;

console.log("object:", obj.toString());
console.log("array:", arr.toString());
console.log("num:", num.toString());
console.log("text:", text.toString());
console.log("bool:", flag.toString());

obj.toString = function () {
    return "own:" + obj.label;
};
console.log("own object:", obj.toString(), Reflect.apply(obj.toString, obj, []));

obj.toString = 7;
try {
    console.log(obj.toString());
} catch (e) {
    console.log("bad object:", e);
}

const bare: any = Object.create(null);
try {
    console.log(bare.toString());
} catch (e) {
    console.log("bare object:", e);
}
