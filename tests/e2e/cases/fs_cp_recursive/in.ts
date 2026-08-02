import * as nodefs from "node:fs";
import { cpSync } from "node:fs";

const root = "/tmp/tsc2c-fs-cp-recursive";
const src = path.join(root, "src");
const syncDest = path.join(root, "sync-dest");
const promiseDest = path.join(root, "promise-dest");

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(path.join(src, "nested"), { recursive: true });
fs.writeFileSync(path.join(src, "root.txt"), "root");
fs.writeFileSync(path.join(src, "nested", "child.txt"), "child");

cpSync(src, syncDest, { recursive: true });
console.log("sync:", fs.readFileSync(path.join(syncDest, "root.txt")) + "/" + fs.readFileSync(path.join(syncDest, "nested", "child.txt")));

nodefs.promises.cp(src, promiseDest, { recursive: true, force: true }).then((value: any): string => {
    console.log("promise:", fs.readFileSync(path.join(promiseDest, "root.txt")) + "/" + fs.readFileSync(path.join(promiseDest, "nested", "child.txt")));
    fs.rmSync(root, { recursive: true, force: true });
    return "done";
});
