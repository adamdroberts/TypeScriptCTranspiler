const mark = process.hrtime();
const diff = process.hrtime(mark);
let seen = "";
function side(label: string): string {
    seen += label;
    return label;
}
const ignored = process.hrtime(mark, side("h"));

console.log("mark:", mark.length, mark[0] >= 0, mark[1] >= 0, mark[1] < 1000000000);
console.log("diff:", diff.length, diff[0] >= 0, diff[1] >= 0, diff[1] < 1000000000);
console.log("ignored:", ignored.length, ignored[0] >= 0, ignored[1] >= 0, ignored[1] < 1000000000, seen);
