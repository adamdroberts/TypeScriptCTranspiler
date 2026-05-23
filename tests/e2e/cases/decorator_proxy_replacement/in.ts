let seen = "";

function replace(value: any, context: any): any {
    seen = seen + "replace:" + String(context.kind) + ":" + String(context.name) + "|";
    return function(this: Box, text: string): string {
        seen = seen + "call:" + this.prefix + ":" + text + "|";
        return this.prefix + ":" + text + ":proxy-replacement";
    };
}

function trapApply(target: any, thisArg: any, args: any): any {
    seen = seen + "apply:" + String(args[1].kind) + ":" + String(args[1].name) + "|";
    return Reflect.apply(target, thisArg, args);
}

const proxied: any = new Proxy(replace as any, { apply: trapApply as any });

class Box {
    prefix: string = "box";

    @proxied
    label(text: string): string {
        seen = seen + "original|";
        return text + ":original";
    }
}

const box = new Box();
console.log("seen:", seen);
console.log("label:", box.label("value"));
console.log("seen2:", seen);
