const nums: any = [1, 2, 3, 4];

const changed = nums.toSpliced(1, 2, "a", "b");
const tail = nums.toSpliced(-2);
const inserted = nums.toSpliced(2, 0, 7);
const copy = nums.toSpliced();

console.log("changed:", changed.join(","));
console.log("tail:", tail.join(","));
console.log("inserted:", inserted.join(","));
console.log("copy:", copy.join(","));
console.log("orig:", nums.join(","));
