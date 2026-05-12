const nums = [10, 20];

console.log("object:", Object.hasOwn(nums, "0"), Object.hasOwn(nums, "2"), Object.hasOwn(nums, "length"));
console.log("method:", nums.hasOwnProperty("1"), nums.hasOwnProperty("length"));
console.log("enum:", nums.propertyIsEnumerable("0"), nums.propertyIsEnumerable("length"), nums.propertyIsEnumerable("01"));
console.log("reflect:", Reflect.has(nums, "0"), Reflect.has(nums, "length"), Reflect.has(nums, "3"));
console.log("in:", "0" in nums, "length" in nums, "3" in nums);
