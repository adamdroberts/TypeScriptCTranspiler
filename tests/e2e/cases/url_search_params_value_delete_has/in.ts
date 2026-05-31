import { URLSearchParams as NodeURLSearchParams } from "node:url";

function printParams(params: URLSearchParams) {
    console.log("size:", params.size, "toString:", params.toString());
}

console.log("--- 1. Global URLSearchParams Tests ---");
const p = new URLSearchParams("a=1&b=2&a=3&a=1&c=4");
printParams(p);

// Test has(name) - one arg
console.log("has a:", p.has("a")); // true
console.log("has d:", p.has("d")); // false

// Test has(name, value) - two args
console.log("has a=1:", p.has("a", "1")); // true
console.log("has a=3:", p.has("a", "3")); // true
console.log("has a=5:", p.has("a", "5")); // false
console.log("has b=2:", p.has("b", "2")); // true
console.log("has b=3:", p.has("b", "3")); // false

// Test has(name, value, ignored...) - ignored extra args
console.log("has a=1 ignored:", p.has("a", "1", "extra", 123)); // true
console.log("has a=5 ignored:", p.has("a", "5", "extra", 123)); // false

// Test delete(name, value) - two args
console.log("delete a=1");
p.delete("a", "1");
printParams(p); // size: 3, should contain b=2, a=3, c=4

// Test delete(name, value, ignored...) - ignored extra args
console.log("delete nonexistent with extra");
p.delete("nonexistent", "val", "ignored");
printParams(p); // size: 3

console.log("delete b=3 (non-matching value)");
p.delete("b", "3");
printParams(p); // size: 3, still b=2

console.log("delete b=2");
p.delete("b", "2");
printParams(p); // size: 2, should contain a=3, c=4

// Test delete(name) - one arg (removes all)
console.log("delete remaining a");
p.delete("a");
printParams(p); // size: 1, should contain c=4

console.log("--- 2. imported NodeURLSearchParams Tests ---");
const np = new NodeURLSearchParams("x=10&y=20&x=10&x=30");
printParams(np);

console.log("has x=10:", np.has("x", "10")); // true
console.log("has x=40:", np.has("x", "40")); // false

console.log("delete x=10");
np.delete("x", "10");
printParams(np); // size: 2 (y=20, x=30)

console.log("delete x");
np.delete("x");
printParams(np); // size: 1 (y=20)
