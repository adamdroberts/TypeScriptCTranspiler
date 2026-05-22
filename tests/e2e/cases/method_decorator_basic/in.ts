let seen = "";

function mark(value: any, context: ClassMethodDecoratorContext): void {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
}

class Box {
    value: number = 3;

    @mark
    getValue(): number {
        return this.value;
    }

    @mark
    static label(): string {
        return "box";
    }
}

const box = new Box();
console.log("decorators:", seen);
console.log("calls:", box.getValue(), Box.label());
