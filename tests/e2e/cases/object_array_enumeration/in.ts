const nums = [4, 5, 6];
const words = ["red", "blue"];

const keys = Object.keys(nums);
const values = Object.values(nums);
const entries = Object.entries(nums);
const names = Object.getOwnPropertyNames(nums);
const own = Reflect.ownKeys(nums);
const wordEntries = Object.entries(words);

console.log("keys:", keys.join("|"));
console.log("values:", values.join("|"));
console.log("entry0:", entries[0][0], entries[0][1]);
console.log("entry2:", entries[2][0], entries[2][1]);
console.log("names:", names.join("|"));
console.log("own:", own.join("|"));
console.log("words:", wordEntries[0][0], wordEntries[0][1], wordEntries[1][0], wordEntries[1][1]);
