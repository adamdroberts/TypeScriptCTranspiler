const nums = [1, 2, 3];
const words = ["a", "b", "c"];
const flags = [true, false, true];
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

console.log("nums:", nums.toString());
console.log("words:", words.toLocaleString());
console.log("flags:", flags.toString());
console.log("ignored:", nums.toString(mark("s")), words.toLocaleString(mark("l")), seen);
