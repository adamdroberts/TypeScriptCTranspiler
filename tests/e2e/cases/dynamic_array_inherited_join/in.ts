const dynamicValues: any[] = ["deleted", null, undefined];
delete dynamicValues[0];
const dynamic: any = dynamicValues;
const dynamicProto: any = Object.create(Array.prototype);
dynamicProto[0] = "inherited";
Object.setPrototypeOf(dynamic, dynamicProto);
console.log(
    "dynamic:",
    Array.prototype.join.call(dynamic, "|"),
    Array.prototype.toString.call(dynamic),
);

const typed: any[] = ["deleted", null, undefined];
delete typed[0];
const typedProto: any = Object.create(Array.prototype);
typedProto[0] = "inherited";
Object.setPrototypeOf(typed, typedProto);
console.log("typed:", typed.join("|"), typed.toString());

const holes: any[] = ["deleted", "value", "deleted"];
delete holes[0];
delete holes[2];
console.log("holes:", holes.join("|"), holes.toString());
