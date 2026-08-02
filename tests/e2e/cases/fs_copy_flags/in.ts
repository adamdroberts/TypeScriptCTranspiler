import { constants } from "fs";

const src = "/tmp/tsc2c-fs-copy-flags-src.txt";
const dest = "/tmp/tsc2c-fs-copy-flags-dest.txt";
const missing = "/tmp/tsc2c-fs-copy-flags-missing.txt";
const DEFAULT_COPY_FLAGS = undefined;
const EXCLUSIVE_COPY_FLAGS = constants.COPYFILE_EXCL;
const events: string[] = [];

function note(label: string): void {
    events.push(label);
}

for (const file of [src, dest, missing]) {
    if (fs.existsSync(file)) fs.rmSync(file);
}

fs.writeFileSync(src, "source");
fs.writeFileSync(dest, "existing");

try {
    fs.copyFileSync(src, dest, fs.constants.COPYFILE_EXCL);
    console.log("sync excl: copied");
} catch (err: any) {
    console.log("sync excl:", err);
}

console.log("after excl:", fs.readFileSync(dest));
fs.copyFileSync(src, dest, constants.COPYFILE_FICLONE);
console.log("after overwrite:", fs.readFileSync(dest));

fs.writeFileSync(dest, "alias-existing");
fs.copyFileSync(src, dest, DEFAULT_COPY_FLAGS);
console.log("sync default alias:", fs.readFileSync(dest));

fs.writeFileSync(dest, "void-default");
fs.copyFileSync(src, dest, void 0);
console.log("sync void default:", fs.readFileSync(dest));

fs.writeFileSync(dest, "side-default");
fs.copyFileSync(src, dest, void note("sync-flags"));
console.log("sync side default:", fs.readFileSync(dest));

try {
    fs.copyFileSync(src, dest, EXCLUSIVE_COPY_FLAGS);
    console.log("sync excl alias: copied");
} catch (err: any) {
    console.log("sync excl alias:", err);
}

fs.writeFileSync(dest, "promise-default");
fs.promises.copyFile(src, dest, DEFAULT_COPY_FLAGS)
    .then((_value: any): any => {
        console.log("promise default alias:", fs.readFileSync(dest));
        fs.writeFileSync(dest, "promise-void");
        return fs.promises.copyFile(src, dest, void 0);
    })
    .then((_value: any): any => {
        console.log("promise void default:", fs.readFileSync(dest));
        fs.writeFileSync(dest, "promise-side");
        return fs.promises.copyFile(src, dest, void note("promise-flags"));
    })
    .then((_value: any): any => {
        console.log("promise side default:", fs.readFileSync(dest));
        return fs.promises.copyFile(src, dest, EXCLUSIVE_COPY_FLAGS);
    })
    .then((_value: any): any => console.log("promise excl: copied"), (reason: string): any => {
        console.log("promise excl:", reason);
        return undefined;
    })
    .then((_value: any): any => fs.promises.copyFile(missing, dest)
        .then((_copyValue: any): any => console.log("promise missing: copied"), (reason: string): any => {
            console.log("promise missing:", reason);
            return undefined;
        }))
    .then((_value: any): void => {
        console.log("events:", events.join("|"));
        console.log("constants:", fs.constants.COPYFILE_EXCL, constants.COPYFILE_FICLONE, constants.COPYFILE_FICLONE_FORCE);

        for (const file of [src, dest, missing]) {
            if (fs.existsSync(file)) fs.rmSync(file);
        }
    });
