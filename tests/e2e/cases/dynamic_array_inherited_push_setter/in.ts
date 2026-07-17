let dynamicSeen = "";
function setDynamic(value: any): void {
    dynamicSeen = String(value);
}
const dynamicValues: any[] = ["a", "b"];
const dynamic: any = dynamicValues;
const dynamicProto: any = {};
Object.defineProperty(dynamicProto, "2", {
    configurable: true,
    set: setDynamic,
});
Object.setPrototypeOf(dynamic, dynamicProto);
const dynamicLength = Array.prototype.push.call(dynamic, "dynamic");
console.log(
    "dynamic:",
    dynamicLength,
    dynamic.length,
    dynamicSeen,
    Object.hasOwn(dynamic, "2"),
    Object.keys(dynamic).join("|"),
);

let typedSeen = "";
function setTyped(value: any): void {
    typedSeen = String(value);
}
const typed: any[] = ["a", "b"];
const typedProto: any = {};
Object.defineProperty(typedProto, "2", {
    configurable: true,
    set: setTyped,
});
Object.setPrototypeOf(typed, typedProto);
const typedLength = typed.push("typed");
console.log(
    "typed:",
    typedLength,
    typed.length,
    typedSeen,
    Object.hasOwn(typed, "2"),
    Object.keys(typed).join("|"),
);
