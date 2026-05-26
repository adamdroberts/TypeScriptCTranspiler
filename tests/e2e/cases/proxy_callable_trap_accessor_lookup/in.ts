const events: string[] = [];

function Target(this: any, value: any): any {
    this.value = value;
}

function applyTrap(target: any, thisArg: any, args: any): any {
    events.push("applyTrap:" + thisArg.base + ":" + args[0]);
    return thisArg.base + ":" + args[0];
}

function constructTrap(target: any, args: any, newTarget: any): any {
    events.push("constructTrap:" + args[0] + ":" + String(newTarget === callableProxy));
    return { built: args[0], newTargetIsProxy: newTarget === callableProxy };
}

let callableProxy: any = undefined;
const handler: any = {};
Object.defineProperty(handler, "apply", {
    get: function(this: any): any {
        events.push("getApply:" + String(this === handler));
        return applyTrap as any;
    },
    enumerable: true,
    configurable: true,
});
Object.defineProperty(handler, "construct", {
    get: function(this: any): any {
        events.push("getConstruct:" + String(this === handler));
        return constructTrap as any;
    },
    enumerable: true,
    configurable: true,
});

callableProxy = new Proxy(Target as any, handler);

console.log("apply:", Reflect.apply(callableProxy, { base: "ctx" }, ["x"]));
const made: any = new callableProxy("y");
console.log("construct:", made.built, made.newTargetIsProxy);
console.log("events:", events.join("|"));
