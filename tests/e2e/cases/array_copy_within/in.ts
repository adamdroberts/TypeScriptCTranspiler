const nums = [1, 2, 3, 4, 5];
nums.copyWithin(0, 3);
console.log(nums.join(","));

const letters = ["a", "b", "c", "d", "e"];
letters.copyWithin(1, -2);
console.log(letters.join(""));
