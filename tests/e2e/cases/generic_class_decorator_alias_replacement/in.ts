let seen = "";

function replace(ctor: any, context: ClassDecoratorContext): any {
    seen = seen + String(context.kind) + ":" + String(context.name) + "|";
    return function(left: number, item: any): any {
        seen = seen + "replacement:" + left + ":" + String(item) + "|";
        return Reflect.construct(ctor, [left + 1, String(item) + ":decorated"]);
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

const PairAlias = Pair;
const PairChain = PairAlias;

const direct: Pair<string> = new PairAlias<string>(1, "direct");
const chained: Pair<string> = new PairChain<string>(3, "chain");
const reflected: Pair<string> = Reflect.construct(PairAlias, [5, "reflect"]);

console.log("direct:", direct.left, direct.get());
console.log("chained:", chained.left, chained.get());
console.log("reflected:", reflected.left, reflected.get());
console.log("seen:", seen);
