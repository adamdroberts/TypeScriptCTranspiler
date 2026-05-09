const nums: any = [3, 1, 21, 10, 2];
const same: any = nums.sort();
console.log("nums:", nums.join(","), same === nums);

const mixed: any = ["banana", "Apple", "apple", "cherry", 12, 2];
mixed.sort();
console.log("mixed:", mixed.join("|"));
