let marks = "";
function mark(label: string): string {
    marks += label;
    return label;
}

console.log(
    "null:",
    Object.is(Object.preventExtensions(null, mark("a")), null),
    Object.is(Object.seal(null, mark("b")), null),
    Object.is(Object.freeze(null, mark("c")), null),
);
console.log(
    "undefined:",
    Object.is(Object.preventExtensions(undefined, mark("d")), undefined),
    Object.is(Object.seal(undefined, mark("e")), undefined),
    Object.is(Object.freeze(undefined, mark("f")), undefined),
);
console.log("types:", typeof Object.freeze(null), typeof Object.freeze(undefined));
console.log("marks:", marks);
