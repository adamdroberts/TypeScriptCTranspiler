function* lazyObjects(): Generator<string, string, number> {
    const values: any[] = [
        { name: "a", score: 1, extra: "x" },
        { name: "b", score: undefined, extra: "y" },
    ];
    for (const { name: label, score = 0, ...rest } of values) {
        yield `${label}:${score}:${String(rest.extra)}:${String(rest.name)}`;
    }
    return "object-done";
}

const iter = lazyObjects();
const one: any = iter.next(0);
const two: any = iter.next(0);
const three: any = iter.next(0);
console.log("one", one.done, one.value);
console.log("two", two.done, two.value);
console.log("three", three.done, three.value);
