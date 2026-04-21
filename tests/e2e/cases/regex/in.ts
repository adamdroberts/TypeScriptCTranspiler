const re = /\d+/;
console.log("test '42':", re.test("42"));
console.log("test 'abc':", re.test("abc"));

const emailRe = /\w+@\w+\.\w+/;
console.log("email match:", emailRe.test("alice@example.com"));

// Replace first
console.log("replace:", "hello world".replace(/world/, "there"));

// Replace all (g flag)
console.log("replaceAll:", "a1 b2 c3".replace(/\d/g, "X"));

// Match
const tokens = "pi=3.14 e=2.71".match(/\d+\.\d+/g);
if (tokens !== null) {
    console.log("matches:", tokens.join(","));
} else {
    console.log("no matches");
}

// Split on regex
const parts = "one  two   three".split(/\s+/);
console.log("parts:", parts.join("|"));

// Case-insensitive
const ci = /hello/i;
console.log("ci test:", ci.test("HELLO"));
console.log("ci test:", ci.test("goodbye"));
