const target: any = ["zero"];
const fromObject: any = { 1: "one" };
Object.assign(target, fromObject);
console.log("object", target.length, target[0], target[1]);

const fromString: any = "xy";
Object.assign(target, fromString);
console.log("string", target.length, target[0], target[1]);

const fromArray: any = ["first", "second", "third"];
Object.assign(target, fromArray);
console.log("array", target.length, target[0], target[1], target[2]);
