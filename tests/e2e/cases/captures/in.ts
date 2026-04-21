// Module-level const/let are now file-scope — usable from top-level fns + arrows.
const base = 10;
let counter = 0;

function add(x: number): number {
    return x + base;  // captures module-level `base`
}

const multiplyByBase = (x: number) => x * base;  // lifted-arrow captures `base`

function bump(): number {
    counter = counter + 1;
    return counter;
}

console.log("add(5):", add(5));
console.log("multiplyByBase(7):", multiplyByBase(7));
const b1 = bump();
const b2 = bump();
const b3 = bump();
console.log("bump x3:", b1, b2, b3);
console.log("counter:", counter);

// Captures flowing through HOFs via named reference.
const nums: number[] = [1, 2, 3, 4];
const results = nums.map(multiplyByBase);
console.log("mapped:", results.join(","));

// Interface type captured in arrow.
interface Box {
    value: number;
}
const wrap = (n: number): Box => ({ value: n + base });
const boxes = nums.map(wrap);
boxes.forEach((b) => console.log("  box:", b.value));
