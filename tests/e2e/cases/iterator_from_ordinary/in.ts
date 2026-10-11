const from = Iterator.from;
const iterator = from(new Set<number>([1, 2, 3]));
console.log("identity:", from(iterator) === iterator, iterator instanceof Iterator);
console.log("values:", iterator.toArray().join(","));
console.log("string:", from("abc").toArray().join(","));
let index = 0;
const source: Iterator<number> = { next() { return index < 2 ? { value: ++index, done: false } : { value: 0, done: true }; } };
console.log("direct:", from(source).reduce((sum, value) => sum + value, 0));
try { new Iterator(); } catch (error) { console.log("abstract:", error instanceof TypeError); }
