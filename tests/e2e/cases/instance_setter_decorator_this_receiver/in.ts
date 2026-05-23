let seen = "";
let stored = "";

function replace(value: any, context: ClassSetterDecoratorContext): (this: Box, text: string) => void {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
    return function(this: Box, text: string): void {
        seen = seen + "this:" + this.prefix + "|";
        stored = this.prefix + ":" + text + ":replacement";
    };
}

class Box {
    prefix: string = "box";

    @replace
    set label(text: string) {
        stored = this.prefix + ":" + text + ":original";
    }
}

const box = new Box();
box.label = "value";
console.log("seen:", seen);
console.log("stored:", stored);
