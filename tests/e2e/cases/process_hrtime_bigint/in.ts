const start = process.hrtime.bigint();
const pair = process.hrtime();
const end = process.hrtime.bigint();
let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}
const ignored = process.hrtime.bigint(mark("b"));

console.log("types:", typeof start, typeof end);
console.log("ordered:", start <= end, end > 0n);
console.log("pair:", pair.length, typeof pair[0], typeof pair[1]);
console.log("ignored:", typeof ignored, ignored > 0n, seen);
