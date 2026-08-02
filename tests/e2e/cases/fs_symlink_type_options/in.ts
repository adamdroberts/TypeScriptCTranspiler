import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-symlink-type-options";
const fileTarget = path.join(root, "target.txt");
const dirTarget = path.join(root, "target-dir");
const fileLink = path.join(root, "file-link");
const dirLink = path.join(root, "dir-link");
const FILE_TYPE = "file";
const DIR_TYPE = "dir";

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(fileTarget, "target");
fs.mkdirSync(dirTarget);

fs.symlinkSync(fileTarget, fileLink, FILE_TYPE);
console.log("sync:", fs.readlinkSync(fileLink) === fileTarget, fs.lstatSync(fileLink).isSymbolicLink());

nodefs.promises.symlink(dirTarget, dirLink, DIR_TYPE).then((value: any): string => {
    value;
    console.log("promise:", fs.readlinkSync(dirLink) === dirTarget, fs.lstatSync(dirLink).isSymbolicLink());
    fs.rmSync(root, { recursive: true, force: true });
    return "done";
});
