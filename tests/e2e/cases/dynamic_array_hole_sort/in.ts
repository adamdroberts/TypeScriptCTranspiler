const values: any = ["delta", "alpha", "charlie", "bravo"];
delete values[1];
values.sort();
console.log("sort:", Object.keys(values).join("|"), values[0], values[1], values[2], String(values[3]));

const numbers: any = [3, 1, 2, 4];
delete numbers[2];
function descending(left: number, right: number): number {
    return right - left;
}
const sorted: any = numbers.toSorted(descending);
console.log("toSorted:", Object.keys(numbers).join("|"), Object.keys(sorted).join("|"), sorted[0], sorted[1], sorted[2], String(sorted[3]));
