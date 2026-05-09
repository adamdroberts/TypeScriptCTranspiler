const nums = Array.of(3, 1, 2);
const words = Array.of("a", "b", "c");

console.log("nums:", nums.join(","));
console.log("sorted:", nums.toSorted().join(","));
console.log("words:", words.join("|"));
