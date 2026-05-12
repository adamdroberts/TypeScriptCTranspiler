import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-chmod-root";
const filePath = root + "/file.txt";

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "mode");

fs.chmodSync(filePath, 0o600);
console.log("sync:", fs.statSync(filePath).mode % 512);

nodefs.promises.chmod(filePath, 0o644);
console.log("promise:", nodefs.statSync(filePath).mode % 512);

fs.rmSync(root, { recursive: true, force: true });
