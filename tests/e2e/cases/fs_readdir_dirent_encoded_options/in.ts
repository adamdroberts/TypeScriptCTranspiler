import { readdirSync } from "node:fs";
import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-readdir-dirent-encoded-options";
const HEX = "hex";
const BASE64 = "base64";

function names(entries: FSDirent[]): string {
    return entries.map((entry) => entry.name + ":" + entry.isFile() + ":" + entry.isDirectory()).sort().join("|");
}

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root + "/sub", { recursive: true });
fs.writeFileSync(root + "/alpha.txt", "alpha");
fs.writeFileSync(root + "/beta.txt", "beta");

const syncHex = fs.readdirSync(root, { withFileTypes: true, encoding: HEX });
console.log("sync hex:", names(syncHex));

const namedBase64 = readdirSync(root, { encoding: BASE64, withFileTypes: true });
console.log("named base64:", names(namedBase64));

nodefs.promises.readdir(root, { withFileTypes: true, encoding: HEX }).then((entries: FSDirent[]): void => {
    console.log("promise hex:", names(entries));
    fs.rmSync(root, { recursive: true, force: true });
});
