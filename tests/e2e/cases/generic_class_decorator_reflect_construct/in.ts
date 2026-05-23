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
const literal: Pair<number> = Reflect.construct(Pair, [1, 2]);
const typedArgs = [3, 4];
const typed: Pair<number> = Reflect.construct(Pair, typedArgs);
const dynamicArgs: any = [5, 6];
const dynamic: Pair<number> = Reflect.construct(Pair, dynamicArgs);
const tail = [8];
const spread: Pair<number> = Reflect.construct(Pair, [7, ...tail]);

console.log("literal:", literal.left, literal.get());
console.log("typed:", typed.left, typed.get());
console.log("dynamic:", dynamic.left, dynamic.get());
console.log("spread:", spread.left, spread.get());
console.log("seen2:", seen);
