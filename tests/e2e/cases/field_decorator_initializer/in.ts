let seen = "";

function twice(value: any, context: ClassFieldDecoratorContext): (initial: any) => any {
    seen = seen + "decorate:" + String(context.name) + ":" + String(context.static) + "|";
    return (initial: any): any => {
        seen = seen + "init:" + String(context.name) + ":" + String(initial) + "|";
        return initial * 2;
    };
}

class Box {
    @twice
    value: number = 5;

    @twice
    static count: number = 3;
}

const box = new Box();
console.log("seen:", seen);
console.log("fields:", box.value, Box.count);
