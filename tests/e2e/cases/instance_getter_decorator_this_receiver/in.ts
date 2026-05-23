let seen = "";

function replace(value: any, context: ClassGetterDecoratorContext): (this: Box) => string {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
    return function(this: Box): string {
        seen = seen + "this:" + this.prefix + "|";
        return this.prefix + ":replacement";
    };
}

class Box {
    prefix: string = "box";

    @replace
    get label(): string {
        return this.prefix + ":original";
    }
}

const box = new Box();
console.log("seen:", seen);
console.log("label:", box.label);
console.log("seen2:", seen);
