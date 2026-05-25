let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

const text: any = "abcdef";
const cmpText: any = "beta";
const num: any = 42;

console.log("sub:", text.substring(1, 4, mark("s")), text.substr(2, 3, mark("b")));
console.log("locale:", cmpText.localeCompare("alpha", mark("l")) > 0, num.toLocaleString(mark("n")));
console.log("seen:", seen);
