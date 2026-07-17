const sparseValues: any[] = ["deleted", undefined, "tail"];
delete sparseValues[0];
const sparse: any = sparseValues;

console.log(
    "holes:",
    sparse.indexOf(undefined),
    sparse.lastIndexOf(undefined),
    sparse.includes(undefined),
);

const inheritedValues: any[] = ["deleted", "tail"];
delete inheritedValues[0];
const inherited: any = inheritedValues;
Object.setPrototypeOf(inherited, { 0: "inherited" });

const indexOf: any = Array.prototype.indexOf;
const lastIndexOf: any = Array.prototype.lastIndexOf;
console.log(
    "inherited:",
    Reflect.apply(indexOf, inherited, ["inherited"]),
    Reflect.apply(lastIndexOf, inherited, ["inherited"]),
);
