const text = "abc-123";

console.log("digits:", text.search("\\d+"));
console.log("missing:", text.search("z+"));
console.log("regex chars:", "a.c".search("."));
