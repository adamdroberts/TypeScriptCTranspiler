const groups = process.getgroups();
let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}
const ignored = process.getgroups(mark("g"));

console.log("groups:", groups.length >= 1, groups.includes(process.getegid()));
console.log("ignored:", ignored.length >= 1, ignored.includes(process.getegid()), seen);
