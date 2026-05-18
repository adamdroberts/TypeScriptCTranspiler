import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-cp-options";
const src = path.join(root, "src.txt");
const dest = path.join(root, "dest.txt");
const preservedDest = path.join(root, "preserved.txt");
const promiseDest = path.join(root, "promise-dest.txt");
const promisePreservedDest = path.join(root, "promise-preserved.txt");

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(src, "new");
fs.writeFileSync(dest, "old");
fs.writeFileSync(promiseDest, "old-promise");

fs.cpSync(src, dest, { force: false });
console.log("sync force false:", fs.readFileSync(dest));

try {
    fs.cpSync(src, dest, { force: false, errorOnExist: true });
    console.log("sync errorOnExist: copied");
} catch (err: any) {
    console.log("sync errorOnExist:", err);
}

fs.cpSync(src, dest, { force: true, errorOnExist: true });
console.log("sync force true:", fs.readFileSync(dest));

fs.utimesSync(src, 11, 12);
fs.cpSync(src, preservedDest, { preserveTimestamps: true });
console.log("sync preserve:", Math.round(fs.statSync(preservedDest).mtimeMs));

try {
    fs.cpSync(src, dest, { force: true, mode: fs.constants.COPYFILE_EXCL });
    console.log("sync mode excl: copied");
} catch (err: any) {
    console.log("sync mode excl:", err);
}

nodefs.promises.cp(src, promiseDest, { force: false }).then((value: any): string => {
    console.log("promise force false:", fs.readFileSync(promiseDest));
    return "done";
});

nodefs.promises.cp(src, promiseDest, { force: false, errorOnExist: true }).catch((reason: string): any => {
    console.log("promise errorOnExist:", reason);
    return "done";
});

nodefs.promises.cp(src, promisePreservedDest, { preserveTimestamps: true }).then((value: any): string => {
    console.log("promise preserve:", Math.round(fs.statSync(promisePreservedDest).mtimeMs));
    return "done";
});

nodefs.promises.cp(src, promiseDest, { force: true, mode: fs.constants.COPYFILE_EXCL }).catch((reason: string): any => {
    console.log("promise mode excl:", reason);
    return "done";
});

fs.rmSync(root, { recursive: true, force: true });
