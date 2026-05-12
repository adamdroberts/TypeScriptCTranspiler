const parts = "a,b,c,d".split(",", 2);
console.log("string:", parts.join("|"), parts.length);

const chars = "abcd".split("", 3);
console.log("chars:", chars.join("-"), chars.length);

const words = "one  two   three".split(/\s+/, 2);
console.log("regex:", words.join("|"), words.length);

const captures = "a1b22c".split(/(\d+)/);
console.log("captures:", captures.join("|"), captures.length);

const limitedCaptures = "a1b2c".split(/(\d)/, 3);
console.log("limited captures:", limitedCaptures.join("|"), limitedCaptures.length);

const none = "x,y".split(",", 0);
console.log("zero:", none.length);
