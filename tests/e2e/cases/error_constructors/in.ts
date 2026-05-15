const typeError: TypeError = new TypeError("bad type");
const rangeError = RangeError("bad range");
const syntaxError = new SyntaxError();

console.log("type:", typeError.name, typeError.message, String(typeError));
console.log("range:", rangeError.name, rangeError.message, rangeError.toString());
console.log("syntax:", syntaxError.name, syntaxError.message, syntaxError.toString());

try {
    throw rangeError;
} catch (e) {
    console.log("caught:", e);
}
