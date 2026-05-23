let seen = "";

function replace(value: any, context: ClassGetterDecoratorContext): () => string {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
    return (): string => {
        seen = seen + "get|";
        return "replacement";
    };
}

class Box {
    @replace
    get label(): string {
        return "original";
    }
}

const box = new Box();
console.log("seen:", seen);
console.log("label:", box.label);
console.log("seen2:", seen);
