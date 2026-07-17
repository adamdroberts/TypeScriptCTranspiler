const withMethod: any = Array.prototype.with;

const inheritedValues: any[] = ["deleted", "tail"];
delete inheritedValues[0];
const inherited: any = inheritedValues;
Object.setPrototypeOf(inherited, { 0: "inherited" });
const inheritedCopy: any = Reflect.apply(withMethod, inherited, [1, "replacement"]);
console.log(
    "inherited:",
    inheritedCopy.join("|"),
    Object.keys(inheritedCopy).join("|"),
    Object.hasOwn(inherited, "0"),
);

const dynamicValues: any[] = ["deleted", "tail"];
delete dynamicValues[0];
const dynamic: any = dynamicValues;
const dynamicCopy: any = dynamic.with(1, "replacement");
console.log(
    "dynamic hole:",
    dynamicCopy.join("|"),
    Object.keys(dynamicCopy).join("|"),
    Object.hasOwn(dynamicCopy, "0"),
);

const typed: any[] = ["deleted", "tail"];
delete typed[0];
const typedCopy: any[] = typed.with(1, "replacement");
const typedDynamic: any = typedCopy;
console.log(
    "typed hole:",
    typedDynamic.join("|"),
    Object.keys(typedCopy).join("|"),
    Object.hasOwn(typedCopy, "0"),
);
