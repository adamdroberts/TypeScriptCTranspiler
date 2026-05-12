const nums: any = [10, 2, 30, 4];
const same: any = nums.sort((a: any, b: any) => b - a);
console.log("desc:", nums.join(","), same === nums);

const blockNums: any = [5, 1, 3];
blockNums.sort((a: any, b: any) => {
    return a - b;
});
console.log("block asc:", blockNums.join(","));

function byLength(a: string, b: string): number {
    return a.length - b.length;
}

const words: any = ["pear", "fig", "banana", "kiwi"];
words.sort(byLength);
console.log("length:", words.join("|"));
