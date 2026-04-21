// Spread in array literal
const a: number[] = [1, 2, 3];
const b: number[] = [4, 5];
const combined = [0, ...a, ...b, 6];
console.log(combined.join(","));

// Object.keys on typed interface
interface User {
    name: string;
    age: number;
    active: boolean;
}
const u: User = { name: "Alice", age: 30, active: true };
const keys = Object.keys(u);
console.log("keys:", keys.join(","));

// string.padStart / padEnd / replace / replaceAll
console.log("pad:", "5".padStart(3, "0"), "|", "x".padEnd(4, "-"));
console.log("replace:", "hello world".replace("world", "there"));
console.log("replaceAll:", "a-b-c".replaceAll("-", "/"));

// Array.from + Array.isArray
const copy = Array.from(a);
console.log("from:", copy.join(","));
console.log("isArray(a):", Array.isArray(a));
console.log("isArray(42):", Array.isArray(42));
