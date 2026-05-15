console.log("ids:", process.getuid() >= 0, process.getgid() >= 0);
console.log("effective:", process.geteuid() >= 0, process.getegid() >= 0);
