const bodies = ["17;", "19;"];
let cursor = 0;
const iterable = {
    [Symbol.iterator]() {
        return {
            next() {
                var index = cursor++;
                return index < bodies.length
                    ? { done: false, value: bodies[index] }
                    : { done: true, value: undefined };
            },
        };
    },
};
function evaluate(body: string): number {
    return eval(body) as number;
}
console.log("source:" + (evaluate as Function)(...iterable));
console.log("steps:" + cursor);
