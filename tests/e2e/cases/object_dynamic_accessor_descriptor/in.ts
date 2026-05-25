let slot: any = "initial";

function getValue(this: any): any {
    return this.marker + ":" + slot;
}

function setValue(this: any, next: any): void {
    slot = this.marker + ":" + next;
}

const target: any = { marker: "target" };
const desc: any = {
    get: getValue as any,
    set: setValue as any,
    enumerable: true,
    configurable: true,
};

console.log("object define:", Object.defineProperty(target, "value", desc) === target);
console.log("object get:", target.value);
target.value = "set";
console.log("object set:", slot, target.value);

const ownDesc: any = Object.getOwnPropertyDescriptor(target, "value");
console.log("identity:", ownDesc.get === getValue, ownDesc.set === setValue);
console.log("apply getter:", Reflect.apply(ownDesc.get, { marker: "apply" }, []));
Reflect.apply(ownDesc.set, { marker: "apply" }, ["next"]);
console.log("apply setter:", slot);

const reflectTarget: any = { marker: "reflect" };
const reflectDesc: any = { get: getValue as any, enumerable: true };
console.log("reflect define:", Reflect.defineProperty(reflectTarget, "value", reflectDesc));
console.log("reflect get:", reflectTarget.value, Object.keys(reflectTarget).join(","));
