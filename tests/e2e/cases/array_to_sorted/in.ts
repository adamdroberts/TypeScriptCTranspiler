const nums = [3, 1, 21, 10, 2];
const sorted = nums.toSorted();

console.log("sorted:", sorted.join(","));
console.log("orig:", nums.join(","));

function orderedCopy(input: number[], descending: boolean): number[] {
    const direction = descending ? -1 : 1;
    const cmp = (a: number, b: number): number => direction * (a - b);
    return input.toSorted(cmp);
}

const values = [4, 1, 3, 2];
const desc = orderedCopy(values, true);
console.log("closure:", desc.join(","), values.join(","));

const blockAsc = values.toSorted((a, b) => {
    return a - b;
});
console.log("block asc:", blockAsc.join(","), values.join(","));
