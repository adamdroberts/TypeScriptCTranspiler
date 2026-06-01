const obj: any = { label: "x" };
const num: any = 12.5;
const text: any = "hello";

console.log("object:", obj.toLocaleString());
console.log("num:", num.toLocaleString());
console.log("text:", text.toLocaleString());

obj.toLocaleString = function () {
    return "locale:" + obj.label;
};
console.log("own object:", obj.toLocaleString(), Reflect.apply(obj.toLocaleString, obj, []));

obj.toLocaleString = 7;
try {
    console.log(obj.toLocaleString());
} catch (e) {
    console.log("bad object:", e);
}

const bare: any = Object.create(null);
try {
    console.log(bare.toLocaleString());
} catch (e) {
    console.log("bare object:", e);
}
