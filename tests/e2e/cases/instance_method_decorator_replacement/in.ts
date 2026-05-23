let seen = "";

function replace(value: any, context: ClassMethodDecoratorContext): (text: string) => string {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
    return (text: string): string => {
        seen = seen + "call:" + text + "|";
        return text + ":replacement";
    };
}

class Box {
    @replace
    label(text: string): string {
        return text + ":original";
    }
}

const box = new Box();
console.log("seen:", seen);
console.log("label:", box.label("box"));
console.log("seen2:", seen);
