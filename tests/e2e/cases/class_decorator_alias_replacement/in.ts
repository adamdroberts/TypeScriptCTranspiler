let seen = "";

function replace(value: any, context: ClassDecoratorContext): any {
    seen = seen + String(context.kind) + ":" + String(context.name) + "|";
    return function(label: string): any {
        seen = seen + "replacement:" + label + "|";
        return Reflect.construct(value, [label + ":decorated"]);
    };
}

@replace
class Box {
    label: string;

    constructor(label: string) {
        seen = seen + "original:" + label + "|";
        this.label = label;
    }
}

const Alias = Box;
const direct: Box = new Alias("direct");
const parenthesized: Box = new (Alias)("parenthesized");
const reflected: Box = Reflect.construct(Alias, ["reflected"]);

console.log("direct:", direct.label);
console.log("parenthesized:", parenthesized.label);
console.log("reflected:", reflected.label);
console.log("seen:", seen);
