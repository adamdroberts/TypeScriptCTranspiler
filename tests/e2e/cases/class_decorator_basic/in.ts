let seen = "";

function mark(value: any, context: ClassDecoratorContext): void {
    seen = String(context.kind) + ":" + String(context.name);
}

@mark
class Box {
    value: number = 7;
}

const box = new Box();
console.log("decorator:", seen);
console.log("instance:", box.value);
