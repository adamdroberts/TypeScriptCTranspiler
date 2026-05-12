const proto: any = {};

Object.defineProperty(proto, "x", {
    value: 1,
    writable: true,
    enumerable: true,
    configurable: true,
});

const receiver: any = {};
console.log("set own data receiver:", Reflect.set(proto, "x", 7, receiver), proto.x, receiver.x, Object.hasOwn(receiver, "x"));

const parent: any = {};
Object.defineProperty(parent, "y", {
    value: 3,
    writable: true,
    enumerable: true,
    configurable: true,
});
const child: any = Object.create(parent);
const inheritedReceiver: any = {};
console.log(
    "set inherited receiver:",
    Reflect.set(child, "y", 4, inheritedReceiver),
    parent.y,
    child.y,
    inheritedReceiver.y,
    Object.hasOwn(child, "y"),
);

const lockedTarget: any = {};
Object.defineProperty(lockedTarget, "fixed", {
    value: "fixed",
    writable: false,
    enumerable: true,
    configurable: true,
});
console.log("set nonwritable target:", Reflect.set(lockedTarget, "fixed", "changed", receiver), lockedTarget.fixed, receiver.fixed);

const lockedReceiver: any = {};
Object.defineProperty(lockedReceiver, "x", {
    value: 0,
    writable: false,
    enumerable: true,
    configurable: true,
});
console.log("set nonwritable receiver:", Reflect.set(proto, "x", 9, lockedReceiver), proto.x, lockedReceiver.x);

const emptyTarget: any = {};
const missingReceiver: any = {};
console.log("set missing receiver:", Reflect.set(emptyTarget, "fresh", "ok", missingReceiver), emptyTarget.fresh, missingReceiver.fresh);

let sink = "none";
function getSink(): string {
    return sink;
}
function setSink(value: any): void {
    sink = String(value);
}
Object.defineProperty(proto, "access", {
    get: getSink,
    set: setSink,
    enumerable: true,
    configurable: true,
});
console.log("get accessor receiver:", Reflect.get(proto, "access", receiver));
console.log("set accessor receiver:", Reflect.set(proto, "access", "via", receiver), sink);

function readMarker(this: any): any {
    return this.marker;
}

function writeMarker(this: any, value: any): void {
    this.marker = value;
}

const accessorBase: any = {};
accessorBase.marker = "base";
Object.defineProperty(accessorBase, "bound", {
    get: readMarker,
    set: writeMarker,
    enumerable: true,
    configurable: true,
});
const accessorReceiver: any = {};
accessorReceiver.marker = "receiver";
console.log("bound get default:", accessorBase.bound);
console.log("bound get receiver:", Reflect.get(accessorBase, "bound", accessorReceiver));
console.log(
    "bound set receiver:",
    Reflect.set(accessorBase, "bound", "via-this", accessorReceiver),
    accessorBase.marker,
    accessorReceiver.marker,
);
const boundDescA: any = Object.getOwnPropertyDescriptor(accessorBase, "bound");
const boundDescB: any = Object.getOwnPropertyDescriptor(accessorBase, "bound");
console.log(
    "bound getter identity:",
    typeof boundDescA.get,
    String(boundDescA.get),
    Object.is(boundDescA.get, boundDescB.get),
    boundDescA.get === boundDescB.get,
);
console.log(
    "bound setter identity:",
    typeof boundDescA.set,
    String(boundDescA.set),
    Object.is(boundDescA.set, boundDescB.set),
    boundDescA.set === boundDescB.set,
);
console.log("bound getter apply:", Reflect.apply(boundDescA.get, accessorReceiver, []));
console.log(
    "bound setter apply:",
    Reflect.apply(boundDescA.set, accessorReceiver, ["via-apply"]),
    accessorBase.marker,
    accessorReceiver.marker,
);

function makeClosureAccessor(prefix: string): any {
    const obj: any = {};
    const getBound = function(this: any): any {
        return prefix + ":" + this.marker;
    };
    const setBound = function(this: any, value: any): void {
        this.marker = prefix + ":" + value;
    };
    Object.defineProperty(obj, "boundClosure", {
        get: getBound,
        set: setBound,
        enumerable: true,
        configurable: true,
    });
    return obj;
}

const closureBase: any = makeClosureAccessor("c");
closureBase.marker = "base";
const closureReceiver: any = {};
closureReceiver.marker = "receiver";
console.log("closure get default:", closureBase.boundClosure);
console.log("closure get receiver:", Reflect.get(closureBase, "boundClosure", closureReceiver));
console.log(
    "closure set receiver:",
    Reflect.set(closureBase, "boundClosure", "next", closureReceiver),
    closureBase.marker,
    closureReceiver.marker,
);
const closureDescA: any = Object.getOwnPropertyDescriptor(closureBase, "boundClosure");
const closureDescB: any = Object.getOwnPropertyDescriptor(closureBase, "boundClosure");
console.log(
    "closure getter identity:",
    typeof closureDescA.get,
    String(closureDescA.get),
    Object.is(closureDescA.get, closureDescB.get),
    closureDescA.get === closureDescB.get,
);
console.log(
    "closure setter identity:",
    typeof closureDescA.set,
    String(closureDescA.set),
    Object.is(closureDescA.set, closureDescB.set),
    closureDescA.set === closureDescB.set,
);
console.log("closure getter apply:", Reflect.apply(closureDescA.get, closureReceiver, []));
console.log(
    "closure setter apply:",
    Reflect.apply(closureDescA.set, closureReceiver, ["apply"]),
    closureBase.marker,
    closureReceiver.marker,
);
