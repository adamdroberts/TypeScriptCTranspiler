const mark = process.hrtime();
const diff = process.hrtime(mark);

console.log("mark:", mark.length, mark[0] >= 0, mark[1] >= 0, mark[1] < 1000000000);
console.log("diff:", diff.length, diff[0] >= 0, diff[1] >= 0, diff[1] < 1000000000);
