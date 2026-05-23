let seen = "";

function replace(value: any, context: ClassDecoratorContext): any {
    seen = seen + String(context.kind) + ":" + String(context.name) + "|";
    return function(left: number, right: number): any {
        seen = seen + "replacement:" + left + ":" + right + "|";
        return Reflect.construct(value, [left + 1, right + 1]);
    };
}

@replace
class Pair<T> {
    left: number;
    value: T;

    constructor(left: number, value: T) {
        seen = seen + "original:" + left + ":" + String(value) + "|";
        this.left = left;
        this.value = value;
    }

    get(): T {
        return this.value;
    }
}

console.log("seen:", seen);
const args = [4, 5];
const pair = new Pair<number>(...(args as [number, number]));
console.log("value:", pair.left, pair.get());
console.log("seen2:", seen);
