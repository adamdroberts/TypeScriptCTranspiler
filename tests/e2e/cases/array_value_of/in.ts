const nums = [1, 2, 3];
const same = nums.valueOf();

same[1] = 9;
console.log("same:", same.join("|"));
console.log("source:", nums.join("|"));
console.log("identity:", same.length === nums.length && same[1] === nums[1]);

