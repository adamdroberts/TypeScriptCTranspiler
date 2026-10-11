const parts = "a,b;c".split(/([,;])/);
console.log("captures:", parts.join("|"));
console.log("limit:", /,/[Symbol.split]("a,b,c", 2).join("|"));
console.log("unicode:", /(?:)/u[Symbol.split]("A😀B").join("|"));
const splitter = { [Symbol.split](value: string, limit?: number): string { return value + ":" + limit; } };
console.log("custom:", "text".split(splitter, 3));
const regexp = /,/g;
regexp.lastIndex = 2;
console.log("original:", regexp[Symbol.split]("a,b").join("|"), regexp.lastIndex);
