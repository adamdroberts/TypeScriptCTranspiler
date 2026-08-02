import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-cp-options";
const src = path.join(root, "src.txt");
const dest = path.join(root, "dest.txt");
const preservedDest = path.join(root, "preserved.txt");
const sideDest = path.join(root, "side.txt");
const filteredSkipDest = path.join(root, "filtered-skip.txt");
const filteredCopyDest = path.join(root, "filtered-copy.txt");
const promiseDest = path.join(root, "promise-dest.txt");
const promisePreservedDest = path.join(root, "promise-preserved.txt");
const promiseSideDest = path.join(root, "promise-side.txt");
const promiseFilteredSkipDest = path.join(root, "promise-filtered-skip.txt");
const promiseFilteredCopyDest = path.join(root, "promise-filtered-copy.txt");
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
const FILTER_SKIP_OPTIONS = { filter: () => false };
const FILTER_COPY_OPTIONS = { filter: function (): boolean { return true; } };
const events: string[] = [];

function note(label: string): void {
    events.push(label);
}

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

fs.cpSync(src, sideDest, void note("sync-options"));
console.log("sync side:", fs.readFileSync(sideDest));

fs.cpSync(src, filteredSkipDest, FILTER_SKIP_OPTIONS as any);
console.log("sync filter false:", fs.existsSync(filteredSkipDest));

fs.cpSync(src, filteredCopyDest, FILTER_COPY_OPTIONS as any);
console.log("sync filter true:", fs.readFileSync(filteredCopyDest));

note("promise-options");
let promiseCompletion: Promise<any> = nodefs.promises.cp(src, promiseDest, SKIP_OPTIONS).then((value: any): string => {
    console.log("promise force false:", fs.readFileSync(promiseDest));
    return "done";
});
promiseCompletion = promiseCompletion.then((_value: any) => nodefs.promises.cp(src, promiseDest, ERROR_OPTIONS).then(
    (value: any): string => "unexpected success",
).catch((reason: string): string => {
        console.log("promise errorOnExist:", reason);
        return "done";
    }));
promiseCompletion = promiseCompletion.then((_value: any) => nodefs.promises.cp(src, promisePreservedDest, PRESERVE_OPTIONS).then((value: any): string => {
    console.log("promise preserve:", Math.round(fs.statSync(promisePreservedDest).mtimeMs));
    return "done";
}));
promiseCompletion = promiseCompletion.then((_value: any) => nodefs.promises.cp(src, promiseDest, EXCL_OPTIONS).then(
    (value: any): string => "unexpected success",
).catch((reason: string): string => {
        console.log("promise mode excl:", reason);
        return "done";
    }));
promiseCompletion = promiseCompletion.then((_value: any) => nodefs.promises.cp(src, promiseSideDest, undefined).then((value: any): string => {
    console.log("promise side:", fs.readFileSync(promiseSideDest));
    return "done";
}));
promiseCompletion = promiseCompletion.then((_value: any) => nodefs.promises.cp(src, promiseFilteredSkipDest, FILTER_SKIP_OPTIONS as any).then((value: any): string => {
    console.log("promise filter false:", fs.existsSync(promiseFilteredSkipDest));
    return "done";
}));
promiseCompletion = promiseCompletion.then((_value: any) => nodefs.promises.cp(src, promiseFilteredCopyDest, FILTER_COPY_OPTIONS as any).then((value: any): string => {
    console.log("promise filter true:", fs.readFileSync(promiseFilteredCopyDest));
    return "done";
}));
promiseCompletion.then((_value: any): void => {
    fs.rmSync(root, { recursive: true, force: true });
});

console.log("events:", events.join("|"));
