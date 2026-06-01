function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

const arr: any = [];
const arrHolder: any = {};
Object.setPrototypeOf(arrHolder, arr);
console.log("array reflect cycle:", Reflect.setPrototypeOf(arr, arrHolder));
report("array object cycle", (): any => Object.setPrototypeOf(arr, arrHolder) === arr);

function Fn(this: any): void {}
const fn: any = Fn as any;
const fnHolder: any = {};
Object.setPrototypeOf(fnHolder, fn);
console.log("function reflect cycle:", Reflect.setPrototypeOf(fn, fnHolder));
report("function object cycle", (): any => Object.setPrototypeOf(fn, fnHolder) === fn);

const proxyCycleTarget: any = {};
let proxyCycleReads = 0;
const proxyCycleProto: any = new Proxy({ marker: "proxy" }, {
    getPrototypeOf: function(target: any): any {
        proxyCycleReads++;
        return proxyCycleTarget;
    }
} as any);
console.log("proxy virtual cycle:", Reflect.setPrototypeOf(proxyCycleTarget, proxyCycleProto), proxyCycleReads);
report("proxy virtual cycle object", (): any => Object.setPrototypeOf(proxyCycleTarget, proxyCycleProto) === proxyCycleTarget);
console.log("proxy virtual cycle reads:", proxyCycleReads);

const arrSelf: any = [];
console.log("array self cycle:", Reflect.setPrototypeOf(arrSelf, arrSelf));

function SelfFn(this: any): void {}
const selfFn: any = SelfFn as any;
console.log("function self cycle:", Reflect.setPrototypeOf(selfFn, selfFn));

const proto: any = { marker: "ok" };
const okArr: any = [];
console.log("array non-cycle:", Reflect.setPrototypeOf(okArr, proto), Object.getPrototypeOf(okArr).marker);

function OkFn(this: any): void {}
const okFn: any = OkFn as any;
console.log("function non-cycle:", Reflect.setPrototypeOf(okFn, proto), Object.getPrototypeOf(okFn).marker);
