const branches: string[] = [];
for (let index = 0; index < 5; index++) branches.push(index % 2 ? "odd" : "even");
console.log("index:", branches.join("|"));
let calls = 0;
function number(value: number): number { calls++; return value; }
for (const value of [0, -0, 1, -2, NaN, Infinity]) {
    console.log("condition:", number(value) ? "T" : "F", !!number(value), Boolean(number(value)));
}
console.log("calls:", calls);
function* decisions() {
    for (let index = 0; index < 5; index++) {
        const value: number = yield index;
        yield value ? "T" : "F";
    }
}
const iterator = decisions();
console.log("generator:", iterator.next().value, iterator.next(0).value,
    iterator.next().value, iterator.next(NaN).value, iterator.next().value, iterator.next(2).value);
