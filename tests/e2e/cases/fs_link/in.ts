import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-link-root";
const filePath = root + "/file.txt";
const syncLink = root + "/sync-link.txt";
const promiseLink = root + "/promise-link.txt";

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "linked");

fs.linkSync(filePath, syncLink);
nodefs.promises.link(filePath, promiseLink);

console.log("sync:", fs.readFileSync(syncLink));
console.log("promise:", nodefs.readFileSync(promiseLink));

fs.rmSync(root, { recursive: true, force: true });
