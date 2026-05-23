let seen = "";

function top(value: any, context: ClassDecoratorContext): any {
    seen = seen + "top:" + String(context.name) + "|";
    return function(label: string): any {
        seen = seen + "top-new:" + label + "|";
        return Reflect.construct(value, [label + ":top"]);
    };
}

function bottom(value: any, context: ClassDecoratorContext): any {
    seen = seen + "bottom:" + String(context.name) + "|";
    return function(label: string): any {
        seen = seen + "bottom-new:" + label + "|";
        return Reflect.construct(value, [label + ":bottom"]);
    };
}

@top
@bottom
class Box {
    label: string;

    constructor(label: string) {
        seen = seen + "original:" + label + "|";
        this.label = label;
    }
}

console.log("seen:", seen);
const box = new Box("box");
console.log("label:", box.label);
console.log("seen2:", seen);
