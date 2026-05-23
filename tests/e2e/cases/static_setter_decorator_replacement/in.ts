let seen = "";
let stored = "";

function replace(value: any, context: ClassSetterDecoratorContext): (text: string) => void {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
    return (text: string): void => {
        seen = seen + "set:" + text + "|";
        stored = text + ":replacement";
    };
}

class Box {
    @replace
    static set label(text: string) {
        stored = text + ":original";
    }
}

Box.label = "box";
console.log("seen:", seen);
console.log("stored:", stored);
