let marks = "";
function mark(label: string): string {
    marks += label;
    return label;
}

const stringProto = Object.getPrototypeOf("a", mark("a"));
const otherStringProto = Object.getPrototypeOf("b");
const numberProto = Object.getPrototypeOf(1, mark("b"));
const otherNumberProto = Object.getPrototypeOf(2);
const booleanProto = Object.getPrototypeOf(true, mark("c"));
const otherBooleanProto = Object.getPrototypeOf(false);
const bigintProto = Object.getPrototypeOf(10n, mark("d"));
const symbolProto = Object.getPrototypeOf(Symbol("x"), mark("e"));

console.log("typed stable:", Object.is(stringProto, otherStringProto), Object.is(numberProto, otherNumberProto), Object.is(booleanProto, otherBooleanProto));
console.log("typed distinct:", !Object.is(stringProto, numberProto), !Object.is(numberProto, booleanProto), !Object.is(bigintProto, symbolProto));

const dynString: any = "x";
const dynNumber: any = 4;
const dynBoolean: any = false;
console.log("dynamic stable:", Object.is(Object.getPrototypeOf(dynString), stringProto), Object.is(Object.getPrototypeOf(dynNumber), numberProto), Object.is(Object.getPrototypeOf(dynBoolean), booleanProto));
console.log("proto tags:", Object.prototype.toString.call(stringProto), Object.prototype.toString.call(numberProto));
console.log("marks:", marks);
