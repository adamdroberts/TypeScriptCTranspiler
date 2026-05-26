const events: string[] = [];

function Target(this: any, value: any): any {
    this.value = value;
}

function args(label: string, value: any): any[] {
    events.push(label);
    return [value];
}

function targetApply(target: any, thisArg: any, args: any): any {
    events.push("targetApply:" + thisArg.base + ":" + args[0]);
    return thisArg.base + ":" + args[0];
}

function targetConstruct(target: any, args: any, newTarget: any): any {
    events.push("targetConstruct:" + args[0] + ":" + String(newTarget === callableProxy));
    return { built: args[0], newTargetIsProxy: newTarget === callableProxy };
}

function handlerGet(target: any, prop: any, receiver: any): any {
    events.push("handlerGet:" + String(prop) + ":" + String(receiver === handlerProxy));
    return Reflect.get(target, prop, receiver);
}

let callableProxy: any = undefined;
let handlerProxy: any = undefined;
const handlerTarget: any = {
    apply: targetApply as any,
    construct: targetConstruct as any,
};
handlerProxy = new Proxy(handlerTarget, { get: handlerGet as any });
callableProxy = new Proxy(Target as any, handlerProxy);

console.log("apply:", Reflect.apply(callableProxy, { base: "ctx" }, args("applyArgs", "x")));
const made: any = Reflect.construct(callableProxy, args("constructArgs", "y"));
console.log("construct:", made.built, made.newTargetIsProxy);
console.log("events:", events.join("|"));
