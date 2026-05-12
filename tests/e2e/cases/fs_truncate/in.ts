import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-truncate-root";
const filePath = root + "/file.txt";

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "abcdef");

fs.truncateSync(filePath, 3);
console.log("sync:", fs.statSync(filePath).size);

nodefs.promises.truncate(filePath, 1);
console.log("promise:", nodefs.statSync(filePath).size);

fs.rmSync(root, { recursive: true, force: true });
