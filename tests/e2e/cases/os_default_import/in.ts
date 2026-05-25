import os from "node:os";

const load = os.loadavg();

console.log("default basics:", os.platform().length > 0, os.arch().length > 0, os.EOL === "\n");
console.log("default host:", os.availableParallelism() > 0, os.machine().length > 0, os.version().length > 0);
console.log("default stats:", os.totalmem() >= 0, os.freemem() >= 0, os.uptime() >= 0, load.length);
console.log("default paths:", os.tmpdir(), os.devNull.length > 0);
