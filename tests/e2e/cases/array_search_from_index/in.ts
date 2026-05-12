const nums = [1, 2, 3, 2];
const words = ["a", "b", "a", "c"];

console.log("index from 2:", nums.indexOf(2, 2));
console.log("index negative:", nums.indexOf(2, -2));
console.log("includes from 1:", nums.includes(1, 1));
console.log("last from 2:", nums.lastIndexOf(2, 2));
console.log("last negative:", words.lastIndexOf("a", -2));
