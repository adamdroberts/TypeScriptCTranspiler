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
