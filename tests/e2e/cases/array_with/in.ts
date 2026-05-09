const nums = [1, 2, 3];
const changed = nums.with(1, 9);
const tail = nums.with(-1, 7);

console.log("changed:", changed.join(","));
console.log("tail:", tail.join(","));
console.log("orig:", nums.join(","));
