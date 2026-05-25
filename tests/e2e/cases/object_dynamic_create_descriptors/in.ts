function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

const proto: any = { inherited: "base" };
let hidden: any = 2;

function getHidden(this: any): any {
    return this.inherited + ":" + hidden;
}

function setHidden(this: any, value: any): void {
    hidden = this.inherited + ":" + value;
}

const descriptors: any = {};
descriptors.own = {
    value: "value",
    writable: true,
    enumerable: true,
    configurable: true,
};
descriptors.secret = {
    get: getHidden as any,
    set: setHidden as any,
    enumerable: true,
    configurable: true,
};
descriptors.quiet = {
    value: "hidden",
    writable: true,
    enumerable: false,
    configurable: true,
};

const obj: any = Object.create(proto, descriptors);
console.log("proto:", Object.getPrototypeOf(obj) === proto, obj.inherited);
console.log("keys:", Object.keys(obj).join("|"));
console.log("values:", Object.values(obj).join("|"));
console.log("has:", Object.hasOwn(obj, "own"), Object.hasOwn(obj, "inherited"));
const quietDesc: any = Object.getOwnPropertyDescriptor(obj, "quiet");
console.log("quiet:", quietDesc.enumerable, quietDesc.value);
obj.secret = 7;
console.log("secret:", hidden, obj.secret);
const secretDesc: any = Object.getOwnPropertyDescriptor(obj, "secret");
console.log("identity:", secretDesc.get === getHidden, secretDesc.set === setHidden);
console.log("json:", JSON.stringify(obj));

const inheritedMap: any = { inherited: { value: "skip", enumerable: true } };
const ownMap: any = Object.create(inheritedMap);
ownMap.own = { value: "own", enumerable: true, configurable: true };
const ownObj: any = Object.create(null, ownMap);
console.log("own map:", Object.keys(ownObj).join(","), String(ownObj.inherited));

report("bad map", (): any => Object.create(null, 1 as any));
