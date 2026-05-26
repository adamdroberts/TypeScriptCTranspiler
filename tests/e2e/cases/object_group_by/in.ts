const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const parity = Object.groupBy(nums, (n) => n % 2 === 0 ? "even" : "odd") as any;
console.log("even:", JSON.stringify(parity.even));
console.log("odd:", JSON.stringify(parity.odd));
const byHalf = Object.groupBy(nums, (_n, i) => {
    return i < 5 ? "front" : "back";
}) as any;
console.log("front:", JSON.stringify(byHalf.front));
console.log("back:", JSON.stringify(byHalf.back));

const words = ["apple", "ant", "berry", "bee", "cat"];
const byInitial = Object.groupBy(words, (w) => w.charAt(0)) as any;
console.log("a:", JSON.stringify(byInitial.a));
console.log("b:", JSON.stringify(byInitial.b));
console.log("c:", JSON.stringify(byInitial.c));

let ignoredOrder = "";
const ignoredGroups = Object.groupBy(["x", "yy"], (w) => w.length > 1 ? "long" : "short", (ignoredOrder += "A", 1), (ignoredOrder += "B", 2)) as any;
console.log("ignored:", JSON.stringify(ignoredGroups.short), JSON.stringify(ignoredGroups.long), ignoredOrder);

function classify(n: number, i: number): string {
    return i < 3 ? "first" : "last";
}
const arr = [10, 20, 30, 40, 50];
const halves = Object.groupBy(arr, classify) as any;
console.log("first:", JSON.stringify(halves.first));
console.log("last:", JSON.stringify(halves.last));

const wordSet = new Set(["ape", "ant", "bear", "bat", "cat"]);
const setGroups = Object.groupBy(wordSet, (word, index) => {
    return index < 3 ? "early" : word.charAt(0);
}) as any;
console.log("set early:", JSON.stringify(setGroups.early));
console.log("set b:", JSON.stringify(setGroups.b));
console.log("set c:", JSON.stringify(setGroups.c));

const charGroups = Object.groupBy("abacad", (ch, index) => {
    return index < 3 ? "front" : ch;
}) as any;
console.log("string front:", JSON.stringify(charGroups.front));
console.log("string a:", JSON.stringify(charGroups.a));
console.log("string d:", JSON.stringify(charGroups.d));

const sourceMap = new Map<string, number>([
    ["red", 1],
    ["blue", 2],
    ["green", 3],
    ["gold", 4],
    ["gray", 0],
]);
const mapGroups = Object.groupBy(sourceMap, (entry, index) => {
    return index < 2 ? "front" : entry[1] >= 3 ? "large" : "small";
}) as any;
console.log("map front:", JSON.stringify(mapGroups.front));
console.log("map large:", JSON.stringify(mapGroups.large));
console.log("map small:", JSON.stringify(mapGroups.small));
