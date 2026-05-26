const withMessage = new Error("boom");
const empty = new Error();
const called = Error("called");
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

const extra = new Error("extra", {}, mark("n"));
const calledExtra = Error("called-extra", {}, mark("c"));
const undefinedExtra = new Error(undefined, undefined, mark("u"));
const calledUndefinedExtra = Error(undefined, undefined, mark("d"));

console.log("with:", withMessage.name, withMessage.message, withMessage.toString(), String(withMessage));
console.log("empty:", empty.name, empty.message, empty.toString());
console.log("called:", called.name, called.message, called.toLocaleString(), called.valueOf() === called);
console.log("extra:", extra.name, extra.message, calledExtra.message, seen);
console.log("undefined:", undefinedExtra.message, calledUndefinedExtra.message, undefinedExtra.cause === undefined, calledUndefinedExtra.cause === undefined, seen);
console.log("methods:", withMessage.toString(mark("s")), called.toLocaleString(mark("l")), called.valueOf(mark("v")) === called, seen);

try {
    throw withMessage;
} catch (e) {
    console.log("caught:", e);
}
