const nums = [1, 2, 3, 4];
nums.fill(9, 1, 3);
console.log(nums.join(","));

const words = ["a", "b", "c"];
console.log(words.fill("z", -2).join(""));
