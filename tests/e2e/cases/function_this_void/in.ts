function add(this: void, left: number, right: number = 1): number {
    return left + right;
}

const inc = function(this: void, value: number): number {
    return value + 1;
};

const values = [1, 2, 3];
const callback: (this: void, value: number) => number = inc;

console.log("direct:", add(2, 3), add(4));
console.log("value:", callback(5));
console.log("map:", values.map(inc).join(","));
console.log("reduce:", values.reduce(function(this: void, acc: number, value: number): number {
    return acc + value;
}, 0));
