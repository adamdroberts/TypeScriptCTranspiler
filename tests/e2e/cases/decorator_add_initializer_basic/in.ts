let seen = "";

function initClass(value: any, context: ClassDecoratorContext): void {
    context.addInitializer(() => {
        seen = seen + "class:" + String(context.name) + "|";
    });
}

function initMethod(value: any, context: ClassMethodDecoratorContext): void {
    context.addInitializer(() => {
        seen = seen + "method:" + String(context.name) + "|";
    });
}

@initClass
class Box {
    @initMethod
    method(): void {}
}

console.log("seen:", seen);
