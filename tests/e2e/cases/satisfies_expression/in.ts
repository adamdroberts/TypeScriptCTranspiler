interface NamedCount {
    name: string;
    count: number;
}

const item: NamedCount = ({ name: "Ada", count: 2 } satisfies NamedCount);
const label = ("ok" + "!") satisfies string;
const nums = [1, 2, 3] satisfies number[];
const total = ((item.count + nums.length) satisfies number) + 5;

class Holder {
    static value: string = ("static" satisfies string);
}

function add(a: number, b: number): number {
    return a + b;
}

class Pair {
    value: string;

    constructor(left: string, right: string) {
        this.value = left + right;
    }
}

const reflected = Reflect.apply(add, undefined, ([4, 6] satisfies number[]));
const pair: Pair = Reflect.construct(Pair, (["x", "y"] satisfies string[]));

console.log("item:", item.name, item.count);
console.log("label:", label);
console.log("nums:", nums.join(","), nums.length);
console.log("total:", total);
console.log("class:", Holder.value);
console.log("reflect:", reflected, pair.value);
