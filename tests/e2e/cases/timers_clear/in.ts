let seen = "";
let marks = "";

function mark(label: string): string {
    marks += label;
    return label;
}

const timeout = setTimeout(() => {
    seen += "cancelled-timeout";
}, 0);
const keptTimeout = setTimeout((label: string) => {
    seen += label;
    console.log("timeout:", label, seen);
}, 0, "T");

const immediate = setImmediate(() => {
    seen += "cancelled-immediate";
});
const keptImmediate = setImmediate((label: string) => {
    seen += label;
    console.log("immediate:", label, seen);
}, "I");
const intervalAlias = setTimeout(() => {
    seen += "cancelled-interval-alias";
}, 0);

clearTimeout(timeout, mark("x"));
clearImmediate(immediate, mark("y"));
clearTimeout(undefined, mark("u"));
clearImmediate(void mark("v"));
clearInterval(intervalAlias, mark("z"));
clearInterval(undefined, mark("w"));
clearTimeout(999);
clearImmediate();

console.log(
    "before:",
    seen === "",
    marks,
    typeof timeout,
    typeof immediate,
    keptTimeout > timeout,
    keptImmediate > immediate,
);
