const nums = [1, 2, 3, 4];
const doubled = Array.from(nums, (n, i) => n * 2 + i);
console.log("doubled:", doubled.join(","));

const block = Array.from(nums, (n, i) => {
    return n + i;
});
console.log("block:", block.join(","));

const labels = Array.from(nums, (n) => "n=" + n);
console.log("labels:", labels.join("|"));

function classify(n: number, i: number): string {
    return i === 0 ? "first:" + n : "rest:" + n;
}
const tagged = Array.from(nums, classify);
console.log("tagged:", tagged.join(";"));

const letters = Array.from("abc", (c, i) => c + i);
console.log("letters:", letters.join(","));

const sizes = Array.from("hello", (c) => c.length);
console.log("sizes:", sizes.join(","));
