const before = process.cwd();

process.chdir("/tmp");
console.log("tmp:", process.cwd());

process.chdir(before);
console.log("restored:", process.cwd() === before);
