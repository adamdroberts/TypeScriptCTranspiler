let seen = "";

function make(name: string): (value: any, context: ClassMethodDecoratorContext) => (text: string) => string {
    seen = seen + "eval:" + name + "|";
    return (value: any, context: ClassMethodDecoratorContext): (text: string) => string => {
        seen = seen + "call:" + name + ":" + String(context.name) + "|";
        return (text: string): string => {
            seen = seen + "run:" + name + "|";
            return name + ":" + text;
        };
    };
}

class Box {
    @make("top")
    @make("bottom")
    static label(text: string): string {
        seen = seen + "original|";
        return text;
    }
}

console.log("seen:", seen);
console.log("label:", Box.label("box"));
console.log("seen2:", seen);
