const typeError: TypeError = new TypeError("bad type");
const rangeError = RangeError("bad range");
const syntaxError = new SyntaxError();
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

const typeExtra = new TypeError("extra type", {}, mark("t"));
const rangeExtra = RangeError("extra range", {}, mark("r"));

console.log("type:", typeError.name, typeError.message, String(typeError));
console.log("range:", rangeError.name, rangeError.message, rangeError.toString());
console.log("syntax:", syntaxError.name, syntaxError.message, syntaxError.toString());
console.log("extra:", typeExtra.name, typeExtra.message, rangeExtra.name, rangeExtra.message, seen);

try {
    throw rangeError;
} catch (e) {
    console.log("caught:", e);
}
