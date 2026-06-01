function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

function targetFn(): void {}

const arr: any = [];
const fnVal: any = targetFn as any;

const arrayProto: any = Object.getPrototypeOf(arr);
const functionProto: any = Object.getPrototypeOf(fnVal);
const objectProto: any = Object.getPrototypeOf({});

console.log("arrayProto:", typeof arrayProto, arrayProto);
console.log("functionProto:", typeof functionProto, functionProto);
console.log("objectProto:", typeof objectProto, objectProto);
console.log("objectProto parent:", typeof Object.getPrototypeOf(objectProto), Object.getPrototypeOf(objectProto));

report("arrayProto isPrototypeOf arr", (): any => Object.prototype.isPrototypeOf.call(arrayProto, arr));
report("functionProto isPrototypeOf fnVal", (): any => Object.prototype.isPrototypeOf.call(functionProto, fnVal));
report("objectProto isPrototypeOf arr", (): any => Object.prototype.isPrototypeOf.call(objectProto, arr));
report("objectProto isPrototypeOf fnVal", (): any => Object.prototype.isPrototypeOf.call(objectProto, fnVal));
report("null isPrototypeOf arr", (): any => Object.prototype.isPrototypeOf.call(null as any, arr));
report("undefined isPrototypeOf fnVal", (): any => Object.prototype.isPrototypeOf.call(undefined as any, fnVal));

const descsNum: any = Object.getOwnPropertyDescriptors(1 as any);
const descsBool: any = Object.getOwnPropertyDescriptors(true as any);

console.log("descsNum keys:", Object.keys(descsNum).join("|"));
console.log("descsBool keys:", Object.keys(descsBool).join("|"));

report("descsNull", (): any => Object.getOwnPropertyDescriptors(null as any));
report("descsUndefined", (): any => Object.getOwnPropertyDescriptors(undefined as any));
