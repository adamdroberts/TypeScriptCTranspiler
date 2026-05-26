const nums = [1, 2, 3, 4];

const changed = nums.toSpliced(1, 2, 9, 8);
const tail = nums.toSpliced(-2);
const inserted = nums.toSpliced(2, 0, 7);
const undefinedStart = nums.toSpliced(undefined, 2, 9);
const undefinedDelete = nums.toSpliced(1, undefined, 8);
const copy = nums.toSpliced();

console.log("changed:", changed.join(","));
console.log("tail:", tail.join(","));
console.log("inserted:", inserted.join(","));
console.log("undefined start:", undefinedStart.join(","));
console.log("undefined delete:", undefinedDelete.join(","));
console.log("copy:", copy.join(","));
console.log("orig:", nums.join(","));
