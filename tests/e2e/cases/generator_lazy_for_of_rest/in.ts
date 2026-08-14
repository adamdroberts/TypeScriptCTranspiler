function* lazyRest(): Generator<string, string, number> {
    const values: any = [["a", 1, 2], ["b"]];
    for (const [head, ...tail] of values) {
        yield String(head) + ":" + String(tail.length) + ":" + String(tail[0]) + ":" + String(tail[1]);
    }
    return "rest-done";
}

const iter = lazyRest();
const one: any = iter.next(0);
const two: any = iter.next(0);
const three: any = iter.next(0);
console.log("one", one.done, one.value);
console.log("two", two.done, two.value);
console.log("three", three.done, three.value);
