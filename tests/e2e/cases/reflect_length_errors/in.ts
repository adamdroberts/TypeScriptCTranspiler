function add(a: number, b: number): number {
    return a + b;
}

class Box {
    value: number;

    constructor(a: number, b: number) {
        this.value = a + b;
    }
}

function catchReflectApply(args: any): string {
    try {
        return String(Reflect.apply(add, undefined, args));
    } catch (err) {
        return String(err);
    }
}

function catchReflectConstruct(args: any): string {
    try {
        const box = Reflect.construct(Box, args);
        return String(box.value);
    } catch (err) {
        return String(err);
    }
}

function catchDirectSpread(args: any): string {
    try {
        return String(add(...(args as [number, number])));
    } catch (err) {
        return String(err);
    }
}

const addValue: (a: number, b: number) => number = add;

function catchFunctionSpread(args: any): string {
    try {
        return String(addValue(...(args as [number, number])));
    } catch (err) {
        return String(err);
    }
}

const shortTyped = [1];
const shortDynamic: any = [1];
const emptyTail: number[] = [];

console.log("apply typed:", catchReflectApply(shortTyped));
console.log("apply dynamic:", catchReflectApply(shortDynamic));
console.log("apply spread:", catchReflectApply([1, ...emptyTail]));
console.log("construct typed:", catchReflectConstruct(shortTyped));
console.log("construct dynamic:", catchReflectConstruct(shortDynamic));
console.log("construct spread:", catchReflectConstruct([1, ...emptyTail]));
console.log("direct spread:", catchDirectSpread(shortDynamic));
console.log("function spread:", catchFunctionSpread(shortDynamic));
console.log("valid:", catchReflectApply([2, 3]), catchReflectConstruct([4, 5]));
