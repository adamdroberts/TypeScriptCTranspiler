import * as fs from "node:fs";
import * as path from "node:path";
import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-cp-symlink-options";
const target = path.join(root, "target.txt");
const link = path.join(root, "link.txt");
const copyDefault = path.join(root, "copy-default.txt");
const copyVerbatim = path.join(root, "copy-verbatim.txt");
const copyDeref = path.join(root, "copy-deref.txt");
const copyPromiseDefault = path.join(root, "copy-promise-default.txt");
const copyPromise = path.join(root, "copy-promise.txt");
const VERBATIM_TRUE = true;
const DEREFERENCE_TRUE = true;
const RECURSIVE_TRUE = true;
const VERBATIM_OPTIONS = { verbatimSymlinks: VERBATIM_TRUE };
const DEREFERENCE_OPTIONS = { dereference: DEREFERENCE_TRUE, recursive: RECURSIVE_TRUE };

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(target, "target");
fs.symlinkSync("target.txt", link);

fs.cpSync(link, copyDefault);
console.log("default link:", fs.lstatSync(copyDefault).isSymbolicLink(), fs.readlinkSync(copyDefault));

fs.cpSync(link, copyVerbatim, VERBATIM_OPTIONS);
console.log("verbatim link:", fs.readlinkSync(copyVerbatim));

fs.cpSync(link, copyDeref, DEREFERENCE_OPTIONS);
console.log("dereference file:", fs.lstatSync(copyDeref).isSymbolicLink(), fs.readFileSync(copyDeref));

nodefs.promises.cp(link, copyPromiseDefault).then((value: any): Promise<any> => {
    console.log("promise default:", fs.lstatSync(copyPromiseDefault).isSymbolicLink(), fs.readlinkSync(copyPromiseDefault));
    return nodefs.promises.cp(link, copyPromise, VERBATIM_OPTIONS);
}).then((value: any): void => {
    console.log("promise verbatim:", fs.readlinkSync(copyPromise));
    fs.rmSync(root, { recursive: true, force: true });
});
