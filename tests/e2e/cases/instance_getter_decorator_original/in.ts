let seen = "";

function wrap(value: any, context: ClassGetterDecoratorContext): (this: Box) => string {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
    return function(this: Box): string {
        seen = seen + "this:" + this.prefix + "|";
        const original = Reflect.apply(value, this, []);
        return String(original) + ":replacement";
    };
}

class Box {
    prefix: string = "box";

    @wrap
    get label(): string {
        seen = seen + "original:" + this.prefix + "|";
        return this.prefix + ":original";
    }
}

const box = new Box();
console.log("seen:", seen);
console.log("label:", box.label);
console.log("seen2:", seen);
