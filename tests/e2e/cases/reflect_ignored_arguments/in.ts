let marks = "";

function mark(label: string): string {
    marks += label;
    return label;
}

const proto: any = { inherited: 1 };
const obj: any = Object.create(proto);
Object.defineProperty(obj, "fixed", {
    value: 3,
    configurable: true,
    enumerable: true,
    writable: true,
});

console.log("get:", Reflect.get(obj, "fixed", obj, mark("a")));
console.log("has:", Reflect.has(obj, "inherited", mark("b")));
const desc: any = Reflect.getOwnPropertyDescriptor(obj, "fixed", mark("c"));
console.log("desc:", desc.value, desc.enumerable);
console.log("keys:", Reflect.ownKeys(obj, mark("d")).join("|"));
console.log("ext:", Reflect.isExtensible(obj, mark("e")));
console.log("define:", Reflect.defineProperty(obj, "added", { value: 4, enumerable: true, configurable: true }, mark("f")));
console.log("set:", Reflect.set(obj, "fixed", 5, obj, mark("g")), obj.fixed);
console.log("delete:", Reflect.deleteProperty(obj, "added", mark("h")), Reflect.has(obj, "added"));
console.log("proto:", Reflect.getPrototypeOf(obj, mark("i")) === proto);
console.log("set proto:", Reflect.setPrototypeOf(obj, null, mark("j")), Reflect.getPrototypeOf(obj) === null);
console.log("prevent:", Reflect.preventExtensions(obj, mark("k")), Reflect.isExtensible(obj));

function add(left: number, right: number): number {
    return left + right;
}

function DynamicCtor(this: any, label: any): void {
    this.label = label;
}

const dynamicAdd: any = add as any;
const dynamicCtor: any = DynamicCtor as any;
console.log("apply:", Reflect.apply(add, undefined, [2, 3], mark("l")));
console.log("dynamic apply:", Reflect.apply(dynamicAdd, null, [4, 5], mark("m")));
const made: any = Reflect.construct(dynamicCtor, ["box"], dynamicCtor, mark("n"));
console.log("construct:", made.label);

const arr = [10, 20];
console.log("array get:", Reflect.get(arr, "0", arr as any, mark("o")));
console.log("array has:", Reflect.has(arr, "length", mark("p")));
const arrDesc: any = Reflect.getOwnPropertyDescriptor(arr, "1", mark("q"));
console.log("array desc:", arrDesc.value);
console.log("array keys:", Reflect.ownKeys(arr, mark("r")).join("|"));
console.log("array define:", Reflect.defineProperty(arr, "2", { value: 30, enumerable: true, configurable: true, writable: true }, mark("s")), arr.length);
console.log("array delete:", Reflect.deleteProperty(arr, "1", mark("t")));
console.log("array prevent:", Reflect.preventExtensions(arr, mark("u")), Reflect.isExtensible(arr));

class TypedBox {
    value: number;
    label: string;

    constructor() {
        this.value = 7;
        this.label = "typed";
    }
}

const typed = new TypedBox();
console.log("typed get:", Reflect.get(typed, "value", typed as any, mark("v")));
console.log("typed has:", Reflect.has(typed, "label", mark("w")));
const typedDesc: any = Reflect.getOwnPropertyDescriptor(typed, "value", mark("x"));
console.log("typed desc:", typedDesc.value);
console.log("typed keys:", Reflect.ownKeys(typed, mark("y")).join("|"));

console.log("marks:", marks);
