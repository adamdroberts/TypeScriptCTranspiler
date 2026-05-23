let seen = "";

function mark(value: any, context: any): void {
    seen = seen + "mark:" + String(context.kind) + ":" + String(context.name) + "|";
}

function trapApply(target: any, thisArg: any, args: any): any {
    seen = seen + "apply:" + String(args[1].kind) + ":" + String(args[1].name) + "|";
    return Reflect.apply(target, thisArg, args);
}

const proxied: any = new Proxy(mark as any, { apply: trapApply as any });

class Box {
    @proxied
    method(): void {}
}

console.log("seen:", seen);
