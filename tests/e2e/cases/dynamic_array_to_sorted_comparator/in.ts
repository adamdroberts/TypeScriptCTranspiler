const nums: any = [4, 1, 3, 2];
const sorted: any = nums.toSorted((a: any, b: any) => a - b);
console.log("sorted:", sorted.join(","), nums.join(","));

function reverseLex(a: string, b: string): number {
    return b.localeCompare(a);
}

const labels: any = ["b", "aa", "c"];
const reversed: any = labels.toSorted(reverseLex);
console.log("labels:", reversed.join("|"), labels.join("|"));
