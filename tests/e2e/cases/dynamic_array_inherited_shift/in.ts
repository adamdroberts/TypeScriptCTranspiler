const inheritedValues: any[] = ["deleted", "a", "c"];
delete inheritedValues[0];
delete inheritedValues[1];
const inherited: any = inheritedValues;
Object.setPrototypeOf(inherited, { 0: "first", 1: "inherited" });
const inheritedFirst = inherited.shift();
console.log(
    "inherited:",
    inheritedFirst,
    inherited.join("|"),
    Object.keys(inherited).join("|"),
    Object.hasOwn(inherited, "0"),
);

const dynamicValues: any[] = ["first", "deleted", "c"];
delete dynamicValues[1];
const dynamic: any = dynamicValues;
const dynamicFirst = dynamic.shift();
console.log(
    "dynamic hole:",
    dynamicFirst,
    dynamic.join("|"),
    Object.keys(dynamic).join("|"),
    Object.hasOwn(dynamic, "0"),
);

const typed: any[] = ["first", "deleted", "c"];
delete typed[1];
const typedFirst = typed.shift();
const typedDynamic: any = typed;
console.log(
    "typed hole:",
    typedFirst,
    typedDynamic.join("|"),
    Object.keys(typed).join("|"),
    Object.hasOwn(typed, "0"),
);
