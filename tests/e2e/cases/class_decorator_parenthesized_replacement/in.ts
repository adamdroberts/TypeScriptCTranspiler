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
const direct = new (Box)(1, 2);
const args = [3, 4];
const spread = new ((Box))(...(args as [number, number]));

console.log("direct:", direct.left, direct.right);
console.log("spread:", spread.left, spread.right);
console.log("seen2:", seen);
