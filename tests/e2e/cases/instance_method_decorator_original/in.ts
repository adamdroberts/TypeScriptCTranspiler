let seen = "";

function wrap(value: any, context: ClassMethodDecoratorContext): (this: Box, text: string) => string {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
    return function(this: Box, text: string): string {
        seen = seen + "this:" + this.prefix + "|";
        const original = Reflect.apply(value, this, [text]);
        return String(original) + ":replacement";
    };
}

class Box {
    prefix: string = "box";

    @wrap
    label(text: string): string {
        seen = seen + "original:" + this.prefix + ":" + text + "|";
        return this.prefix + ":" + text + ":original";
    }
}

const box = new Box();
console.log("seen:", seen);
console.log("label:", box.label("value"));
console.log("seen2:", seen);
