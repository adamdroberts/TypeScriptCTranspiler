const slice: any = Array.prototype.slice;

const inheritedValues: any[] = ["deleted", "tail"];
delete inheritedValues[0];
const inherited: any = inheritedValues;
Object.setPrototypeOf(inherited, { 0: "inherited" });
const inheritedCopy: any = Reflect.apply(slice, inherited, []);

console.log(
    "inherited:",
    inheritedCopy.join("|"),
    Object.hasOwn(inheritedCopy, "0"),
    Object.keys(inheritedCopy).join("|"),
);

const sparseValues: any[] = ["deleted", "tail"];
delete sparseValues[0];
const sparse: any = sparseValues;
const sparseCopy: any = sparse.slice();

console.log(
    "hole:",
    sparseCopy.join("|"),
    Object.hasOwn(sparseCopy, "0"),
    Object.keys(sparseCopy).join("|"),
);
