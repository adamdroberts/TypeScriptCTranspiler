const nums = [1, 2];
const extra = [4, 5];
const merged = nums.concat(3, [0, ...extra], 6);
const words = ["a"].concat("b", ["c", "d"]);
const moreWords = ["e", "f"];
const spreadWords = words.concat(["-", ...moreWords]);

console.log("nums:", nums.join("|"));
console.log("merged:", merged.join("|"));
console.log("words:", words.join(""));
console.log("spread words:", spreadWords.join(""));
