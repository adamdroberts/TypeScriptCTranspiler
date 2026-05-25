const nums: any = [10, 20, 30];

console.log("default:", nums.at());
console.log("nums:", nums.at(0), nums.at(1), nums.at(-1));
console.log("oob:", nums.at(9));
