let seen = "";

function replace(value: any, context: ClassDecoratorContext): any {
    seen = seen + String(context.kind) + ":" + String(context.name) + "|";
    return function(left: number, right: number): any {
        seen = seen + "replacement:" + left + ":" + right + "|";
        return Reflect.construct(value, [left + 1, right + 1]);
    };
}

@replace
class Box {
    left: number;
    right: number;

    constructor(left: number, right: number) {
        seen = seen + "original:" + left + ":" + right + "|";
        this.left = left;
        this.right = right;
    }
}

console.log("seen:", seen);

const DynamicBox: any = Box;
const direct: Box = new DynamicBox(1, 2);
const reflected: Box = Reflect.construct(DynamicBox, [3, 4]);

console.log("direct:", direct.left, direct.right);
console.log("reflected:", reflected.left, reflected.right);
console.log("seen2:", seen);
