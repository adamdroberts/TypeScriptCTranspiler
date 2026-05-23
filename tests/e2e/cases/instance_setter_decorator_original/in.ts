let seen = "";
let stored = "";

function wrap(value: any, context: ClassSetterDecoratorContext): (this: Box, text: string) => void {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
    return function(this: Box, text: string): void {
        seen = seen + "this:" + this.prefix + "|";
        Reflect.apply(value, this, [text + ":original-call"]);
        stored = stored + ":replacement";
    };
}

class Box {
    prefix: string = "box";

    @wrap
    set label(text: string) {
        seen = seen + "original:" + this.prefix + ":" + text + "|";
        stored = this.prefix + ":" + text;
    }
}

const box = new Box();
box.label = "value";
console.log("seen:", seen);
console.log("stored:", stored);
