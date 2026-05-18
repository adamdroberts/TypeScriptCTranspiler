let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

console.log("ids:", process.getuid() >= 0, process.getgid() >= 0);
console.log("effective:", process.geteuid() >= 0, process.getegid() >= 0);
console.log("ignored:", process.getuid(mark("u")) >= 0, process.getgid(mark("g")) >= 0, process.geteuid(mark("e")) >= 0, process.getegid(mark("h")) >= 0, seen);
