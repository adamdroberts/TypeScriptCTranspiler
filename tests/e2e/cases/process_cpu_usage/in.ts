const cpu = process.cpuUsage();

console.log("types:", typeof cpu.user, typeof cpu.system);
console.log("values:", cpu.user >= 0, cpu.system >= 0);
