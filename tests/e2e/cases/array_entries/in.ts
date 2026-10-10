const nums = [10, 20, 30];
const entries = Array.from(nums.entries());

console.log("first:", entries[0][0], entries[0][1]);
console.log("last:", entries[2][0], entries[2][1]);

const words = ["red", "blue"];
const wordEntries = Array.from(words.entries());

console.log("words:", wordEntries[0][0], wordEntries[0][1], wordEntries[1][0], wordEntries[1][1]);
