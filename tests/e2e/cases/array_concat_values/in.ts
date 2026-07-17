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

const sparseLeft = [1, 2, 3];
delete sparseLeft[1];
const sparseRight = [4, 5, 6];
delete sparseRight[1];
const sparseSlice = sparseLeft.slice();
const sparseConcat = sparseLeft.concat(sparseRight);
console.log("sparse slice:", sparseSlice.join("|"), Object.keys(sparseSlice).join("|"));
console.log("sparse concat:", sparseConcat.join("|"), Object.keys(sparseConcat).join("|"));
