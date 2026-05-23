let seen = "";
let stored = "";

function wrapMethod(value: any, context: ClassMethodDecoratorContext): (text: string) => string {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
    return function(text: string): string {
        seen = seen + "method-wrap:" + text + "|";
        const original = Reflect.apply(value, undefined, [text + ":call"]);
        return String(original) + ":method-replacement";
    };
}

function wrapGetter(value: any, context: ClassGetterDecoratorContext): () => string {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
    return function(): string {
        seen = seen + "getter-wrap|";
        const original = Reflect.apply(value, undefined, []);
        return String(original) + ":getter-replacement";
    };
}

function wrapSetter(value: any, context: ClassSetterDecoratorContext): (text: string) => void {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
    return function(text: string): void {
        seen = seen + "setter-wrap:" + text + "|";
        Reflect.apply(value, undefined, [text + ":call"]);
        stored = stored + ":setter-replacement";
    };
}

class Box {
    @wrapMethod
    static label(text: string): string {
        seen = seen + "method-original:" + text + "|";
        return text + ":method-original";
    }

    @wrapGetter
    static get title(): string {
        seen = seen + "getter-original|";
        return "title-original";
    }

    @wrapSetter
    static set title(text: string) {
        seen = seen + "setter-original:" + text + "|";
        stored = text + ":setter-original";
    }
}

console.log("seen:", seen);
console.log("label:", Box.label("box"));
console.log("title:", Box.title);
Box.title = "set";
console.log("stored:", stored);
console.log("seen2:", seen);
