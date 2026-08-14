function* lazyArrayRest(): Generator<string, string, number> {
    const values: any[][] = [["a", 1, 2], ["b"], ["c", undefined, 4]];
    for (const [head, ...tail] of values) {
        yield String(head) + ":" + String(tail.length) + ":" + String(tail[0]) + ":" + String(tail[1]);
    }
    return "array-rest-done";
}

const iter = lazyArrayRest();
const one: any = iter.next(0);
const two: any = iter.next(0);
const three: any = iter.next(0);
const four: any = iter.next(0);
console.log("one", one.done, one.value);
console.log("two", two.done, two.value);
console.log("three", three.done, three.value);
console.log("four", four.done, four.value);
