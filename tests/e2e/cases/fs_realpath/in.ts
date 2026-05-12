import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-realpath-root";
const nested = root + "/sub";

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(nested, { recursive: true });

const syncPath = fs.realpathSync(nested + "/..");
let promisePath = "";

nodefs.promises.realpath(root + "/sub/..").then((resolved: string): string => {
    promisePath = resolved;
    return resolved;
});

console.log("sync:", syncPath === root);
console.log("promise:", promisePath === root);

fs.rmSync(root, { recursive: true, force: true });
