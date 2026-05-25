function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

let slot: any = "initial";
function getValue(this: any): any {
    return this.marker + ":" + slot;
}
function setValue(this: any, next: any): void {
    slot = this.marker + ":" + next;
}

const descriptors: any = {};
descriptors.a = { value: 1, writable: true, enumerable: true, configurable: true };
descriptors.hidden = { value: "secret", enumerable: false, configurable: true };
descriptors.closed = { get: getValue as any, set: setValue as any, enumerable: true, configurable: true };

const target: any = { marker: "target" };
console.log("same:", Object.defineProperties(target, descriptors) === target);
console.log("keys:", Object.keys(target).join("|"));
console.log("values:", Object.values(target).join("|"));
target.closed = "set";
console.log("closed:", slot, target.closed);
const closedDesc: any = Object.getOwnPropertyDescriptor(target, "closed");
console.log("identity:", closedDesc.get === getValue, closedDesc.set === setValue);
console.log("hidden:", Object.getOwnPropertyDescriptor(target, "hidden").enumerable);

const inherited: any = { inherited: { value: "skip", enumerable: true } };
const descriptorMap: any = Object.create(inherited);
descriptorMap.own = { value: "own", enumerable: true, configurable: true };
const inheritedTarget: any = {};
Object.defineProperties(inheritedTarget, descriptorMap);
console.log("own map:", Object.keys(inheritedTarget).join(","), String(inheritedTarget.inherited));

const closedTarget: any = {};
Object.preventExtensions(closedTarget);
const failedMap: any = { x: { value: 1, enumerable: true } };
report("failed", (): any => Object.defineProperties(closedTarget, failedMap));
report("bad map", (): any => Object.defineProperties({}, 1 as any));
