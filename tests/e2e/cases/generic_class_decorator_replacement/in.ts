let seen = "";

function replace(value: any, context: ClassDecoratorContext): any {
    seen = seen + String(context.kind) + ":" + String(context.name) + "|";
    return function(label: string): any {
        seen = seen + "replacement:" + label + "|";
        return Reflect.construct(value, [label + ":decorated"]);
    };
}

@replace
class Box<T> {
    value: T;

    constructor(value: T) {
        seen = seen + "original:" + String(value) + "|";
        this.value = value;
    }

    get(): T {
        return this.value;
    }
}

console.log("seen:", seen);
const box = new Box<string>("box");
console.log("value:", box.get());
console.log("seen2:", seen);
