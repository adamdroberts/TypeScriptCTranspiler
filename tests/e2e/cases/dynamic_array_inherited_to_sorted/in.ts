const toSorted: any = Array.prototype.toSorted;
function descending(left: any, right: any): number {
    return right - left;
}

const inheritedValues: any[] = [3, 1, 0];
delete inheritedValues[2];
const inherited: any = inheritedValues;
Object.setPrototypeOf(inherited, { 2: 2 });
const inheritedCopy: any = Reflect.apply(toSorted, inherited, [descending]);
console.log(
    "inherited:",
    inheritedCopy.join("|"),
    Object.keys(inheritedCopy).join("|"),
    Object.hasOwn(inherited, "2"),
);

const sparseValues: any[] = [3, 1, 0];
delete sparseValues[2];
const sparse: any = sparseValues;
const sparseCopy: any = sparse.toSorted(descending);
console.log(
    "hole:",
    sparseCopy.join("|"),
    Object.keys(sparseCopy).join("|"),
    Object.hasOwn(sparseCopy, "2"),
);

const explicit: any = [3, 1, undefined];
const explicitCopy: any = explicit.toSorted(descending);
console.log(
    "explicit undefined:",
    explicitCopy.join("|"),
    Object.keys(explicitCopy).join("|"),
    Object.hasOwn(explicitCopy, "2"),
);

const typedInherited: any[] = [3, 1, 0];
delete typedInherited[2];
Object.setPrototypeOf(typedInherited, { 2: 2 });
const typedInheritedCopy = typedInherited.toSorted(descending);
console.log(
    "typed inherited:",
    typedInheritedCopy.join("|"),
    Object.keys(typedInheritedCopy).join("|"),
    Object.hasOwn(typedInherited, "2"),
);

const typedSparse: any[] = [3, 1, 0];
delete typedSparse[2];
const typedSparseCopy = typedSparse.toSorted(descending);
console.log(
    "typed hole:",
    typedSparseCopy.join("|"),
    Object.keys(typedSparseCopy).join("|"),
    Object.hasOwn(typedSparseCopy, "2"),
    Object.hasOwn(typedSparse, "2"),
);
