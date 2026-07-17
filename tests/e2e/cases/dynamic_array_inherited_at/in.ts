const dynamicValues: any[] = ["deleted", "middle", "deleted"];
delete dynamicValues[0];
delete dynamicValues[2];
const dynamic: any = dynamicValues;
Object.setPrototypeOf(dynamic, { 0: "first", 2: "last" });
console.log(
    "dynamic inherited:",
    Array.prototype.at.call(dynamic, 0),
    Array.prototype.at.call(dynamic, -1),
);

const typed: any[] = ["deleted", "middle", "deleted"];
delete typed[0];
delete typed[2];
Object.setPrototypeOf(typed, { 0: "first", 2: "last" });
console.log("typed inherited:", typed.at(0), typed.at(-1));

const holes: any[] = ["deleted", "middle", "deleted"];
delete holes[0];
delete holes[2];
console.log("typed holes:", holes.at(0) === undefined, holes.at(-1) === undefined);
