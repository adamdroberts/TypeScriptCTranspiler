let seen = "";

function top(value: any, context: ClassMethodDecoratorContext): (text: string) => string {
    seen = seen + "top:" + String(context.name) + "|";
    const previous = String(value);
    return (text: string): string => {
        seen = seen + "top-call|";
        return "top:" + text + ":" + previous;
    };
}

function bottom(value: any, context: ClassMethodDecoratorContext): (text: string) => string {
    seen = seen + "bottom:" + String(context.name) + "|";
    const previous = String(value);
    return (text: string): string => {
        seen = seen + "bottom-call|";
        return "bottom:" + text + ":" + previous;
    };
}

class Box {
    @top
    @bottom
    static label(text: string): string {
        seen = seen + "original|";
        return text;
    }
}

console.log("seen:", seen);
console.log("label:", Box.label("box").slice(0, 7));
console.log("seen2:", seen);
