import * as fs from "node:fs";
import * as path from "node:path";
import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-cp-symlink-options";
const target = path.join(root, "target.txt");
const link = path.join(root, "link.txt");
const copyDefault = path.join(root, "copy-default.txt");
const copyVerbatim = path.join(root, "copy-verbatim.txt");
const copyDeref = path.join(root, "copy-deref.txt");
const copyPromise = path.join(root, "copy-promise.txt");

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(target, "target");
fs.symlinkSync("target.txt", link);

fs.cpSync(link, copyDefault);
console.log("default link:", fs.lstatSync(copyDefault).isSymbolicLink(), fs.readlinkSync(copyDefault));

fs.cpSync(link, copyVerbatim, { verbatimSymlinks: true });
console.log("verbatim link:", fs.readlinkSync(copyVerbatim));

fs.cpSync(link, copyDeref, { dereference: true, recursive: true });
console.log("dereference file:", fs.lstatSync(copyDeref).isSymbolicLink(), fs.readFileSync(copyDeref));

nodefs.promises.cp(link, copyPromise, { verbatimSymlinks: true }).then((value: any): string => {
    console.log("promise verbatim:", fs.readlinkSync(copyPromise));
    return "done";
});

fs.rmSync(root, { recursive: true, force: true });
