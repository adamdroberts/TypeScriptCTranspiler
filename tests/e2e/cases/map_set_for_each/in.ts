function mark(label: string): string {
    console.log("ignored:", label);
    return label;
}

const scores = new Map<string, number>();
scores.set("a", 2);
scores.set("bb", 3);

let mapTotal = 0;
scores.forEach((value, key, owner) => mapTotal += value + key.length + owner.size);
let mapBlockTotal = 0;
scores.forEach((value, key, owner) => {
    return mapBlockTotal += value + key.length + owner.size;
});
let mapExtra = 0;
scores.forEach((value) => mapExtra += value, undefined, mark("map-extra"));

const nums = new Set<number>();
nums.add(2);
nums.add(5);

let setTotal = 0;
nums.forEach((value, valueAgain, owner) => setTotal += value + valueAgain + owner.size);
let setBlockTotal = 0;
nums.forEach((value, valueAgain, owner) => {
    return setBlockTotal += value + valueAgain + owner.size;
});
let setExtra = 0;
nums.forEach((value) => setExtra += value, undefined, mark("set-extra"));

console.log("map total:", mapTotal);
console.log("map block total:", mapBlockTotal);
console.log("map extra:", mapExtra);
console.log("set total:", setTotal);
console.log("set block total:", setBlockTotal);
console.log("set extra:", setExtra);
