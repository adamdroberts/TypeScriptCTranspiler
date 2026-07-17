let dynamicSeen = "";
function setDynamic(value: any): void {
    dynamicSeen = String(value);
}
const dynamicValues: any[] = ["a", "deleted", "c"];
delete dynamicValues[1];
const dynamic: any = dynamicValues;
const dynamicProto: any = {};
Object.defineProperty(dynamicProto, "1", { configurable: true, set: setDynamic });
Object.setPrototypeOf(dynamic, dynamicProto);
const dynamicResult = Array.prototype.fill.call(dynamic, "dynamic", 1, 2);
console.log(
    "dynamic:",
    dynamicResult === dynamic,
    dynamicSeen,
    Object.hasOwn(dynamic, "1"),
    Object.keys(dynamic).join("|"),
);

let typedSeen = "";
function setTyped(value: any): void {
    typedSeen = String(value);
}
const typed: any[] = ["a", "deleted", "c"];
delete typed[1];
const typedProto: any = {};
Object.defineProperty(typedProto, "1", { configurable: true, set: setTyped });
Object.setPrototypeOf(typed, typedProto);
const typedResult = typed.fill("typed", 1, 2);
console.log(
    "typed:",
    typedResult === typed,
    typedSeen,
    Object.hasOwn(typed, "1"),
    Object.keys(typed).join("|"),
);
