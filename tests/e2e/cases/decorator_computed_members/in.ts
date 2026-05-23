let seen = "";
let stored = "";

const fieldKey = "tag";
const methodKey = "label";
const getterKey = "current";
const setterKey = "current";

function fieldInit(value: any, context: ClassFieldDecoratorContext): (initial: string) => string {
    seen = seen + "field:" + String(context.name) + ":" + String(context.static) + "|";
    return function(initial: string): string {
        seen = seen + "field-init:" + initial + "|";
        return initial + ":decorated";
    };
}

function methodWrap(value: any, context: ClassMethodDecoratorContext): (this: Box, text: string) => string {
    seen = seen + "method:" + String(context.name) + ":" + String(context.static) + "|";
    return function(this: Box, text: string): string {
        const original = Reflect.apply(value, this, [text]);
        return String(original) + ":method";
    };
}

function getWrap(value: any, context: ClassGetterDecoratorContext): (this: Box) => string {
    seen = seen + "getter:" + String(context.name) + ":" + String(context.static) + "|";
    return function(this: Box): string {
        return String(Reflect.apply(value, this, [])) + ":get";
    };
}

function setWrap(value: any, context: ClassSetterDecoratorContext): (this: Box, next: string) => void {
    seen = seen + "setter:" + String(context.name) + ":" + String(context.static) + "|";
    return function(this: Box, next: string): void {
        Reflect.apply(value, this, [next + ":set"]);
    };
}

class Box {
    @fieldInit
    [fieldKey]: string = "field";

    @methodWrap
    [methodKey](text: string): string {
        return this.tag + ":" + text;
    }

    @getWrap
    get [getterKey](): string {
        return stored;
    }

    @setWrap
    set [setterKey](next: string) {
        stored = this.tag + ":" + next;
    }
}

const box = new Box();
box.current = "value";
console.log("seen:", seen);
console.log("method:", box.label("call"));
console.log("current:", box.current);
console.log("stored:", stored);
