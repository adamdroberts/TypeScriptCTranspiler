const nums = [1, 2, 3, 4];
const removed = nums.splice(1, 2, 9, 8, 7);
console.log("removed:", removed.join(","));
console.log("nums:", nums.join(","));

const tail = nums.splice(-2);
console.log("tail:", tail.join(","));
console.log("after tail:", nums.join(","));

const inserted = nums.splice(1, 0, 5);
console.log("inserted:", inserted.length);
console.log("after insert:", nums.join(","));

const omittedDelete = [10, 11, 12].splice(1);
const undefinedDeleteArr = [10, 11, 12];
const undefinedDelete = undefinedDeleteArr.splice(1, undefined, 99);
const copy = [1, 2].splice();

console.log("omitted:", omittedDelete.join(","));
console.log("undefined:", undefinedDelete.join(","), undefinedDeleteArr.join(","));
console.log("copy:", copy.length);
