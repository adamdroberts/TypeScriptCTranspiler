const toReversed: any = Array.prototype.toReversed;

const inheritedValues: any[] = ["deleted", "tail"];
delete inheritedValues[0];
const inherited: any = inheritedValues;
Object.setPrototypeOf(inherited, { 0: "inherited" });
const inheritedCopy: any = Reflect.apply(toReversed, inherited, []);

console.log(
    "inherited:",
    inheritedCopy.join("|"),
    Object.hasOwn(inheritedCopy, "1"),
    Object.keys(inheritedCopy).join("|"),
);

const dynamicValues: any[] = ["deleted", "tail"];
delete dynamicValues[0];
const dynamic: any = dynamicValues;
const dynamicCopy: any = dynamic.toReversed();
console.log(
    "dynamic hole:",
    dynamicCopy.join("|"),
    Object.hasOwn(dynamicCopy, "1"),
    Object.keys(dynamicCopy).join("|"),
);

const typed: any[] = ["deleted", "tail"];
delete typed[0];
const typedCopy: any[] = typed.toReversed();
const typedDynamic: any = typedCopy;
console.log(
    "typed hole:",
    typedDynamic.join("|"),
    Object.hasOwn(typedCopy, "1"),
    Object.keys(typedCopy).join("|"),
);
