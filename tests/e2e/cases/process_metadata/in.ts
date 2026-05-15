console.log("identity:", process.platform.length > 0, process.arch.length > 0, process.pid > 0);
console.log("cwd:", process.cwd().length > 0);
console.log("uptime:", process.uptime() >= 0);
