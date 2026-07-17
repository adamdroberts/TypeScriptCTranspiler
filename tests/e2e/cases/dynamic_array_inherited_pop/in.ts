const inheritedValues: any[] = ["a", "deleted"];
delete inheritedValues[1];
const inherited: any = inheritedValues;
Object.setPrototypeOf(inherited, { 1: "inherited" });
const inheritedLast = Array.prototype.pop.call(inherited);
console.log(
    "inherited:",
    inheritedLast,
    inherited.length,
    inherited.join("|"),
    Object.keys(inherited).join("|"),
);

const dynamicValues: any[] = ["a", "deleted"];
delete dynamicValues[1];
const dynamic: any = dynamicValues;
const dynamicLast = dynamic.pop();
console.log(
    "dynamic hole:",
    dynamicLast === undefined,
    dynamic.length,
    dynamic.join("|"),
    Object.keys(dynamic).join("|"),
);

const typed: any[] = ["a", "deleted"];
delete typed[1];
const typedLast = typed.pop();
console.log(
    "typed hole:",
    typedLast === undefined,
    typed.length,
    typed.join("|"),
    Object.keys(typed).join("|"),
);
