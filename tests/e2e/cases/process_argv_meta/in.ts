console.log("argv0:", process.argv0.length > 0, process.argv0 === process.argv[0]);
console.log("exec path:", process.execPath.length > 0, process.execPath === process.argv0);
console.log("exec argv:", process.execArgv.length);
