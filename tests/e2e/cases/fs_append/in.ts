import * as nodefs from "node:fs";

const syncPath = "/tmp/tsc2c-fs-append-sync.txt";
const promisePath = "/tmp/tsc2c-fs-append-promise.txt";

if (nodefs.existsSync(syncPath)) nodefs.rmSync(syncPath);
if (nodefs.existsSync(promisePath)) nodefs.rmSync(promisePath);

fs.writeFileSync(syncPath, "a");
nodefs.appendFileSync(syncPath, "b");
fs.appendFileSync(syncPath, "c");

fs.promises.writeFile(promisePath, "x");
fs.promises.appendFile(promisePath, "y");
fs.promises.appendFile(promisePath, "z");

console.log("sync:", nodefs.readFileSync(syncPath));
console.log("promise:", nodefs.readFileSync(promisePath));

nodefs.rmSync(syncPath);
nodefs.rmSync(promisePath);
