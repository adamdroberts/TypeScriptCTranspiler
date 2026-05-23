let seen = "";

function replace(value: any, context: ClassMethodDecoratorContext): (this: Box, text: string) => string {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
    return function(this: Box, text: string): string {
        seen = seen + "this:" + this.prefix + "|";
        return this.prefix + ":" + text + ":replacement";
    };
}

class Box {
    prefix: string = "box";

    @replace
    label(text: string): string {
        return this.prefix + ":" + text + ":original";
    }
}

const box = new Box();
console.log("seen:", seen);
console.log("label:", box.label("value"));
console.log("seen2:", seen);
