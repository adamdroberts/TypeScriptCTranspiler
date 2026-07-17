const inheritedValues: any[] = ["deleted", "middle", "tail"];
delete inheritedValues[0];
const inherited: any = inheritedValues;
Object.setPrototypeOf(inherited, { 0: "inherited" });
const inheritedResult: any = Array.prototype.reverse.call(inherited);
console.log(
    "inherited:",
    inheritedResult === inherited,
    inherited[0],
    inherited[1],
    inherited[2],
    Object.keys(inherited).join("|"),
);

const dynamicValues: any[] = ["deleted", "middle", "tail"];
delete dynamicValues[0];
const dynamic: any = dynamicValues;
dynamic.reverse();
console.log(
    "dynamic hole:",
    dynamic.join("|"),
    Object.keys(dynamic).join("|"),
    Object.hasOwn(dynamic, "2"),
);

const typed: any[] = ["deleted", "middle", "tail"];
delete typed[0];
typed.reverse();
const typedDynamic: any = typed;
console.log(
    "typed hole:",
    typedDynamic.join("|"),
    Object.keys(typed).join("|"),
    Object.hasOwn(typed, "2"),
);
