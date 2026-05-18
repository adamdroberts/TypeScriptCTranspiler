const mem = process.memoryUsage();
let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}
const ignored = process.memoryUsage(mark("m"));

console.log("types:", typeof mem.rss, typeof mem.heapTotal, typeof mem.heapUsed, typeof mem.external, typeof mem.arrayBuffers);
console.log("values:", mem.rss >= 0, mem.heapTotal >= 0, mem.heapUsed >= 0, mem.external >= 0, mem.arrayBuffers >= 0);
console.log("ignored:", typeof ignored.rss, ignored.rss >= 0, seen);
