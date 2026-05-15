const mem = process.memoryUsage();

console.log("types:", typeof mem.rss, typeof mem.heapTotal, typeof mem.heapUsed, typeof mem.external, typeof mem.arrayBuffers);
console.log("values:", mem.rss >= 0, mem.heapTotal >= 0, mem.heapUsed >= 0, mem.external >= 0, mem.arrayBuffers >= 0);
