const inheritedValues: any[] = ["deleted", "a", "b", "c"];
delete inheritedValues[0];
const inherited: any = inheritedValues;
Object.setPrototypeOf(inherited, { 0: "inherited" });
const inheritedResult: any = Array.prototype.copyWithin.call(inherited, 1, 0, 2);
console.log(
    "inherited:",
    inheritedResult === inherited,
    inherited.join("|"),
    Object.keys(inherited).join("|"),
    Object.hasOwn(inherited, "0"),
);

const dynamicValues: any[] = ["deleted", "a", "b", "c"];
delete dynamicValues[0];
const dynamic: any = dynamicValues;
dynamic.copyWithin(1, 0, 2);
console.log(
    "dynamic hole:",
    dynamic.join("|"),
    Object.keys(dynamic).join("|"),
    Object.hasOwn(dynamic, "1"),
);

const typed: any[] = ["deleted", "a", "b", "c"];
delete typed[0];
typed.copyWithin(1, 0, 2);
const typedDynamic: any = typed;
console.log(
    "typed hole:",
    typedDynamic.join("|"),
    Object.keys(typed).join("|"),
    Object.hasOwn(typed, "1"),
);

let dynamicSetterSeen = "";
function setDynamic(value: any): void {
    dynamicSetterSeen = String(value);
}
const dynamicSetterValues: any[] = ["source", "deleted"];
delete dynamicSetterValues[1];
const dynamicSetter: any = dynamicSetterValues;
const dynamicSetterProto: any = {};
Object.defineProperty(dynamicSetterProto, "1", { configurable: true, set: setDynamic });
Object.setPrototypeOf(dynamicSetter, dynamicSetterProto);
Array.prototype.copyWithin.call(dynamicSetter, 1, 0, 1);
console.log(
    "dynamic setter:",
    dynamicSetterSeen,
    Object.hasOwn(dynamicSetter, "1"),
    Object.keys(dynamicSetter).join("|"),
);

let typedSetterSeen = "";
function setTyped(value: any): void {
    typedSetterSeen = String(value);
}
const typedSetter: any[] = ["source", "deleted"];
delete typedSetter[1];
const typedSetterProto: any = {};
Object.defineProperty(typedSetterProto, "1", { configurable: true, set: setTyped });
Object.setPrototypeOf(typedSetter, typedSetterProto);
typedSetter.copyWithin(1, 0, 1);
console.log(
    "typed setter:",
    typedSetterSeen,
    Object.hasOwn(typedSetter, "1"),
    Object.keys(typedSetter).join("|"),
);
