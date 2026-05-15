const start = process.hrtime.bigint();
const pair = process.hrtime();
const end = process.hrtime.bigint();

console.log("types:", typeof start, typeof end);
console.log("ordered:", start <= end, end > 0n);
console.log("pair:", pair.length, typeof pair[0], typeof pair[1]);
