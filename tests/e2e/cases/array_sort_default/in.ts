const nums = [3, 1, 21, 10, 2];
const sortedNums = nums.sort();
console.log("nums:", nums.join(","));
console.log("same nums:", sortedNums === nums);

const words = ["banana", "Apple", "apple", "cherry"];
words.sort();
console.log("words:", words.join("|"));

const flags = [true, false, true];
flags.sort();
console.log("flags:", flags.join(","));
