const arrTarget: any = [];
const arrProxy: any = new Proxy(arrTarget, {});
let arrValue = "arr";

function getArrValue(this: any): any {
    return arrValue;
}

function setArrValue(this: any, value: any): void {
    arrValue = "set-" + value;
}

console.log("array define:", Object.defineProperty(arrProxy, "side", {
    get: getArrValue,
    set: setArrValue,
    enumerable: true,
    configurable: true,
}) === arrProxy);
console.log("array get:", arrTarget.side, arrProxy.side, Object.keys(arrTarget).join("|"));
arrProxy.side = "next";
console.log("array set:", arrTarget.side, arrValue);

function Target(this: any): void {}

const fnTarget: any = Target as any;
const fnProxy: any = new Proxy(fnTarget, {});
let fnValue = 4;

function getFnValue(this: any): any {
    return fnValue;
}

function setFnValue(this: any, value: any): void {
    fnValue = value * 2;
}

console.log("function define:", Reflect.defineProperty(fnProxy, "side", {
    get: getFnValue,
    set: setFnValue,
    enumerable: true,
    configurable: true,
}));
console.log("function get:", fnTarget.side, Reflect.get(fnProxy, "side"), Object.keys(fnTarget).join("|"));
Reflect.set(fnProxy, "side", 9);
console.log("function set:", fnTarget.side, fnValue);
