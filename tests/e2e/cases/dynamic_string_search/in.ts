const text: any = "abc-123";
const pattern: any = "\\d+";

console.log("regex:", text.search(/\d+/));
console.log("string:", text.search(pattern));
console.log("missing:", text.search("z+"));
