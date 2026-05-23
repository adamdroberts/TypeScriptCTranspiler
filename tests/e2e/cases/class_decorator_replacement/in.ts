let seen = "";

function replace(value: any, context: ClassDecoratorContext): any {
    seen = seen + String(context.kind) + ":" + String(context.name) + "|";
    return function(): any {
        seen = seen + "replacement|";
        return Reflect.construct(value, []);
    };
}

@replace
class Box {
    label: string = "box";
}

console.log("seen:", seen);
const box = new Box();
console.log("label:", box.label);
console.log("seen2:", seen);
