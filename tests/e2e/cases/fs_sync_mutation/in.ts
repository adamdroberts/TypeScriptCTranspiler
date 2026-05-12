import * as nodefs from "node:fs";

const dirPath = "/tmp/tsc2c-fs-sync-dir";
const filePath = path.join(dirPath, "note.txt");
const rmFilePath = "/tmp/tsc2c-fs-sync-rm.txt";

if (nodefs.existsSync(filePath)) nodefs.unlinkSync(filePath);
if (nodefs.existsSync(rmFilePath)) nodefs.rmSync(rmFilePath);
if (nodefs.existsSync(dirPath)) nodefs.rmdirSync(dirPath);

nodefs.mkdirSync(dirPath);
nodefs.writeFileSync(filePath, "note");
console.log("names:", nodefs.readdirSync(dirPath).join("|"));
nodefs.unlinkSync(filePath);
nodefs.writeFileSync(rmFilePath, "remove me");
nodefs.rmSync(rmFilePath);
nodefs.rmdirSync(dirPath);

console.log("file exists:", nodefs.existsSync(filePath));
console.log("rm exists:", nodefs.existsSync(rmFilePath));
console.log("dir exists:", nodefs.existsSync(dirPath));
