let marks = "";
function mark(label: string): string {
    marks += label;
    return label;
}

console.log(
    "null:",
    Object.isExtensible(null, mark("a")),
    Object.isSealed(null, mark("b")),
    Object.isFrozen(null, mark("c")),
);
console.log(
    "undefined:",
    Object.isExtensible(undefined, mark("d")),
    Object.isSealed(undefined, mark("e")),
    Object.isFrozen(undefined, mark("f")),
);
console.log("marks:", marks);
