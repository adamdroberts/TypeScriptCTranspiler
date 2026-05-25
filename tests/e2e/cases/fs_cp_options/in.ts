import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-cp-options";
const src = path.join(root, "src.txt");
const dest = path.join(root, "dest.txt");
const preservedDest = path.join(root, "preserved.txt");
const promiseDest = path.join(root, "promise-dest.txt");
const promisePreservedDest = path.join(root, "promise-preserved.txt");
const FORCE_FALSE = false;
const FORCE_TRUE = true;
const ERROR_ON_EXIST_TRUE = true;
const PRESERVE_TIMESTAMPS_TRUE = true;
const COPYFILE_EXCL = fs.constants.COPYFILE_EXCL;
const SKIP_OPTIONS = { force: FORCE_FALSE };
const ERROR_OPTIONS = { force: FORCE_FALSE, errorOnExist: ERROR_ON_EXIST_TRUE };
const OVERWRITE_OPTIONS = { force: FORCE_TRUE, errorOnExist: ERROR_ON_EXIST_TRUE };
const PRESERVE_OPTIONS = { preserveTimestamps: PRESERVE_TIMESTAMPS_TRUE };
const EXCL_OPTIONS = { force: true, mode: COPYFILE_EXCL };

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(src, "new");
fs.writeFileSync(dest, "old");
fs.writeFileSync(promiseDest, "old-promise");

fs.cpSync(src, dest, SKIP_OPTIONS);
console.log("sync force false:", fs.readFileSync(dest));

try {
    fs.cpSync(src, dest, ERROR_OPTIONS);
    console.log("sync errorOnExist: copied");
} catch (err: any) {
    console.log("sync errorOnExist:", err);
}

fs.cpSync(src, dest, OVERWRITE_OPTIONS);
console.log("sync force true:", fs.readFileSync(dest));

fs.utimesSync(src, 11, 12);
fs.cpSync(src, preservedDest, PRESERVE_OPTIONS);
console.log("sync preserve:", Math.round(fs.statSync(preservedDest).mtimeMs));

try {
    fs.cpSync(src, dest, EXCL_OPTIONS);
    console.log("sync mode excl: copied");
} catch (err: any) {
    console.log("sync mode excl:", err);
}

nodefs.promises.cp(src, promiseDest, SKIP_OPTIONS).then((value: any): string => {
    console.log("promise force false:", fs.readFileSync(promiseDest));
    return "done";
});

nodefs.promises.cp(src, promiseDest, ERROR_OPTIONS).catch((reason: string): any => {
    console.log("promise errorOnExist:", reason);
    return "done";
});

nodefs.promises.cp(src, promisePreservedDest, PRESERVE_OPTIONS).then((value: any): string => {
    console.log("promise preserve:", Math.round(fs.statSync(promisePreservedDest).mtimeMs));
    return "done";
});

nodefs.promises.cp(src, promiseDest, EXCL_OPTIONS).catch((reason: string): any => {
    console.log("promise mode excl:", reason);
    return "done";
});

fs.rmSync(root, { recursive: true, force: true });
