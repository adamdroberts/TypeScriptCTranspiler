const original = process.umask();
const previous = process.umask(18);
const current = process.umask();
let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}
const ignoredPrevious = process.umask(current, mark("m"));

console.log("previous:", previous >= 0);
console.log("current:", current);
console.log("ignored:", ignoredPrevious, process.umask(), seen);

process.umask(original);
console.log("restored:", process.umask() === original);
