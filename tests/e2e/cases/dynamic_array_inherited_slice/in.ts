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

const typedValues: any[] = ["deleted", "tail"];
delete typedValues[0];
const typedProto: any = Object.create(Array.prototype);
typedProto[0] = "inherited";
Object.setPrototypeOf(typedValues, typedProto);
const typedCopy = typedValues.slice();
console.log(
    "typed inherited:",
    typedCopy.join("|"),
    Object.hasOwn(typedCopy, "0"),
    Object.keys(typedCopy).join("|"),
);

const typedSparse: any[] = ["deleted", "tail"];
delete typedSparse[0];
const typedSparseCopy = typedSparse.slice();
console.log(
    "typed hole:",
    typedSparseCopy.join("|"),
    Object.hasOwn(typedSparseCopy, "0"),
    Object.keys(typedSparseCopy).join("|"),
);
