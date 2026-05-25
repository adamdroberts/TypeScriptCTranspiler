let marks = "";
function mark(label: string): string {
    marks += label;
    return label;
}

console.log("is:", Object.is(NaN, NaN, mark("a")), Object.is(0, -0, mark("b")));

const proto: any = { inherited: "yes" };
const obj: any = Object.create(proto, {
    x: { value: 4, enumerable: true },
}, mark("c"), mark("d"));
console.log("create literal:", obj.x, obj.inherited, Object.keys(obj).join("|"));

const descriptorMap: any = { y: { value: 5, enumerable: true } };
const dynamicObj: any = Object.create(proto, descriptorMap, mark("e"));
console.log("create dynamic:", dynamicObj.y, dynamicObj.inherited, Object.keys(dynamicObj).join("|"));
console.log("marks:", marks);
