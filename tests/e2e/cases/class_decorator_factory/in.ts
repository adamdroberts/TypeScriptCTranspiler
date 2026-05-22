let seen = "";

function make(label: string): (value: any, context: ClassDecoratorContext) => void {
    return function (value: any, context: ClassDecoratorContext): void {
        seen = seen + label + ":" + String(context.kind) + ":" + String(context.name) + "|";
    };
}

@make("first")
class First {
    value: number = 1;
}

@make("second")
class Second {
    value: number = 2;
}

console.log("decorators:", seen);
console.log("instances:", new First().value, new Second().value);
