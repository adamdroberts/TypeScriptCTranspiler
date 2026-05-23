let seen = "";

function markGet(value: any, context: ClassGetterDecoratorContext): void {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
}

function markSet(value: any, context: ClassSetterDecoratorContext): void {
    seen = seen + String(context.kind) + ":" + String(context.name) + ":" + String(context.static) + "|";
}

class Box {
    @markGet
    get value(): number {
        return 1;
    }

    @markSet
    set value(next: number) {
        seen = seen + "set:" + String(next) + "|";
    }

    @markGet
    static get label(): string {
        return "box";
    }
}

console.log("decorators:", seen);
