const text: any = "go";

console.log("repeat:", text.repeat(3), text.repeat(0).length);
console.log("pad:", text.padStart(5, "."), text.padEnd(5, 1), text.padStart(4));
