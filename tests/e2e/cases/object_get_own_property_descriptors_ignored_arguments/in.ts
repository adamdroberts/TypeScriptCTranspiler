interface Point {
    x: number;
    label: string;
}

let marks = "";
function mark(label: string): string {
    marks += label;
    return label;
}

const point: Point = { x: 3, label: "p" };
const dynamicPoint: any = { alpha: 11 };

const typedDesc: any = Object.getOwnPropertyDescriptor(point, "x", mark("a"));
const typedDescs: any = Object.getOwnPropertyDescriptors(point, mark("b"));
console.log("typed:", typedDesc.value, typedDesc.enumerable, Object.keys(typedDescs).join("|"));

const arrayDesc: any = Object.getOwnPropertyDescriptor([10, 20], "1", mark("c"));
const arrayDescs: any = Object.getOwnPropertyDescriptors([10, 20], mark("d"));
console.log("array:", arrayDesc.value, arrayDescs["length"].value, Object.keys(arrayDescs).join("|"));

const stringDesc: any = Object.getOwnPropertyDescriptor("hi", "1", mark("e"));
const stringDescs: any = Object.getOwnPropertyDescriptors("hi", mark("f"));
console.log("string:", stringDesc.value, stringDescs["length"].value, Object.keys(stringDescs).join("|"));

const primitiveDesc: any = Object.getOwnPropertyDescriptor(7, "x", mark("g"));
const primitiveDescs: any = Object.getOwnPropertyDescriptors(Symbol("s"), mark("h"));
console.log("primitive:", String(primitiveDesc), Object.keys(primitiveDescs).length);

const dynamicDesc: any = Object.getOwnPropertyDescriptor(dynamicPoint, "alpha", mark("i"));
const dynamicDescs: any = Object.getOwnPropertyDescriptors(dynamicPoint, mark("j"), mark("k"));
console.log("dynamic:", dynamicDesc.value, Object.keys(dynamicDescs).join("|"));
console.log("marks:", marks);
