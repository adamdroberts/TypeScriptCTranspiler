let marks = "";

function mark(label: string): string {
    marks += label;
    return label;
}

const repeated = new RegExp("a+", "gi", mark("a"));
const word = RegExp("b(.)", "", mark("b"), mark("c"));

console.log("repeated:", repeated.test("AA"), repeated.flags);

const match = word.exec("bar");
console.log("word:", match ? match.join("|") : "none");
console.log("marks:", marks);
