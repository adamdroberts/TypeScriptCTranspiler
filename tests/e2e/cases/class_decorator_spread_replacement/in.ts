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
const args = [2, 3];
const box = new Box(...(args as [number, number]));
console.log("value:", box.left, box.right);
console.log("seen2:", seen);
