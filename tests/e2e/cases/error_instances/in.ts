const withMessage = new Error("boom");
const empty = new Error();
const called = Error("called");

console.log("with:", withMessage.name, withMessage.message, withMessage.toString(), String(withMessage));
console.log("empty:", empty.name, empty.message, empty.toString());
console.log("called:", called.name, called.message, called.toLocaleString(), called.valueOf() === called);

try {
    throw withMessage;
} catch (e) {
    console.log("caught:", e);
}
