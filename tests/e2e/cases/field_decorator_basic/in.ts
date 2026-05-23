let seen = "";

function mark(value: any, context: ClassFieldDecoratorContext): void {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
}

class Box {
    @mark
    value: number = 5;

    @mark
    static count: number = 2;
}

const box = new Box();
console.log("decorators:", seen);
console.log("fields:", box.value, Box.count);
