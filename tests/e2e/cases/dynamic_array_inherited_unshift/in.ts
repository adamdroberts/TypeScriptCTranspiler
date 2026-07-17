const inheritedValues: any[] = ["deleted", "b"];
delete inheritedValues[0];
const inherited: any = inheritedValues;
Object.setPrototypeOf(inherited, { 0: "inherited" });
const inheritedLength = Array.prototype.unshift.call(inherited, "first");
console.log(
    "inherited:",
    inheritedLength,
    inherited.join("|"),
    Object.keys(inherited).join("|"),
);

const dynamicValues: any[] = ["deleted", "b"];
delete dynamicValues[0];
const dynamic: any = dynamicValues;
const dynamicLength = dynamic.unshift("first");
console.log(
    "dynamic hole:",
    dynamicLength,
    dynamic.join("|"),
    Object.keys(dynamic).join("|"),
    Object.hasOwn(dynamic, "1"),
);

const order: string[] = [];
function item(name: string): string {
    order.push(name);
    return name;
}
const typed: any[] = ["deleted", "b"];
delete typed[0];
const typedLength = typed.unshift(item("first"), item("second"));
const typedDynamic: any = typed;
console.log(
    "typed hole:",
    typedLength,
    typedDynamic.join("|"),
    Object.keys(typed).join("|"),
    Object.hasOwn(typed, "2"),
    order.join("|"),
);
