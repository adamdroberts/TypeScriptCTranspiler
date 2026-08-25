function show(this: any, first?: any): string {
    return this.tag + ":" + String(first);
}

function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err) {
        console.log(label + ":", String(err));
    }
}

const dynamicShow: any = show;

report("bad number", (): any => dynamicShow.apply({ tag: "bad" }, 123));
report("bad string", (): any => dynamicShow.apply({ tag: "bad" }, "xy"));
report("bad boolean", (): any => dynamicShow.apply({ tag: "bad" }, true));
console.log("valid:", dynamicShow.apply({ tag: "ok" }, { 0: "x", length: 1 }));

const uncurryJoin: any = Function.prototype.call.bind(Array.prototype.join);
const uncurryPush: any = Function.prototype.call.bind(Array.prototype.push);
const joined: any[] = ["a", "b", "c"];
const pushed: any[] = ["head"];
console.log("uncurry:", uncurryJoin(joined, "|"), uncurryPush(pushed, "tail"), pushed.join("|"));

const boundShow: any = dynamicShow.bind({ tag: "bound" }, "first");
console.log("bound call:", boundShow(), boundShow.call({ tag: "ignored" }, "second"));
console.log(
    "function prototype:",
    typeof Function.prototype,
    Function.prototype.constructor.name === "Function",
    Object.getPrototypeOf(dynamicShow) === Function.prototype,
    Function.prototype.call.name,
    Function.prototype.apply.length,
    Function.prototype.bind.length,
);
const callDescriptor: any = Object.getOwnPropertyDescriptor(Function.prototype, "call");
const prototypeLengthDescriptor: any = Object.getOwnPropertyDescriptor(Function.prototype, "length");
const constructorPrototypeDescriptor: any = Object.getOwnPropertyDescriptor(Function.prototype.constructor, "prototype");
console.log(
    "function descriptors:",
    callDescriptor.writable,
    callDescriptor.enumerable,
    callDescriptor.configurable,
    prototypeLengthDescriptor.value,
    prototypeLengthDescriptor.writable,
    prototypeLengthDescriptor.enumerable,
    prototypeLengthDescriptor.configurable,
    constructorPrototypeDescriptor.value === Function.prototype,
    constructorPrototypeDescriptor.writable,
    constructorPrototypeDescriptor.enumerable,
    constructorPrototypeDescriptor.configurable,
);
console.log(
    "function intrinsic calls:",
    (Function.prototype as any)("ignored") === undefined,
    Function.prototype.call.call(dynamicShow, { tag: "call" }, "x"),
    Function.prototype.apply.call(dynamicShow, { tag: "apply" }, ["y"]),
    Object.hasOwn(Function.prototype, "prototype"),
    Object.getPrototypeOf(Function.prototype) === Object.prototype,
    Object.getPrototypeOf(Function.prototype.call) === Function.prototype,
);

function BoundConstructor(this: any, left: string, right: string): void {
    this.value = left + ":" + right;
}

function AlternateConstructor(this: any): void {}

const boundConstructor: any = (BoundConstructor as any).bind({ ignored: true }, "left");
const constructed: any = new boundConstructor("right");
const alternate: any = Reflect.construct(boundConstructor, ["alternate"], AlternateConstructor);
console.log(
    "bound construct:",
    constructed.value,
    constructed instanceof BoundConstructor,
    constructed instanceof boundConstructor,
    Object.getPrototypeOf(constructed) === (BoundConstructor as any).prototype,
    alternate.value,
    alternate instanceof AlternateConstructor,
);
console.log(
    "bound metadata:",
    boundConstructor.name,
    boundConstructor.length,
    Object.hasOwn(boundConstructor, "prototype"),
);

let deeplyBound: any = dynamicShow;
for (let depth = 0; depth < 128; depth++) {
    deeplyBound = deeplyBound.bind({ tag: "deep" });
}
console.log("deep bind:", deeplyBound("value"));

report("bad call receiver", (): any => Function.prototype.call.call(1));
report("bad apply receiver", (): any => Function.prototype.apply.call({}, null, []));
report("bad bind receiver", (): any => Function.prototype.bind.call(null, null));

function invokeShadow(Function: any): any {
    return Function("shadow");
}

function shadowTarget(value: string): string {
    return "local:" + value;
}

console.log("shadowed Function:", invokeShadow(shadowTarget as any));
