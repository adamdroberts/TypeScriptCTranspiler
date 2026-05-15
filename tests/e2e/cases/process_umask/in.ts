const original = process.umask();
const previous = process.umask(18);
const current = process.umask();

console.log("previous:", previous >= 0);
console.log("current:", current);

process.umask(original);
console.log("restored:", process.umask() === original);
