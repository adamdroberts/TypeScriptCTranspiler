let seen = "";

function make(name: string): (value: any, context: ClassFieldDecoratorContext) => (initial: any) => any {
    seen = seen + "eval:" + name + "|";
    return (value: any, context: ClassFieldDecoratorContext): (initial: any) => any => {
        seen = seen + "call:" + name + ":" + String(context.name) + ":" + String(context.static) + "|";
        return (initial: any): any => {
            seen = seen + "init:" + name + ":" + String(initial) + "|";
            return String(initial) + ":" + name;
        };
    };
}

class Box {
    @make("top")
    @make("bottom")
    value: string = "x";

    @make("staticTop")
    @make("staticBottom")
    static count: string = "s";
}

const box = new Box();
console.log("seen:", seen);
console.log("fields:", box.value, Box.count);
