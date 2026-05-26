import { constants } from "fs";

const src = "/tmp/tsc2c-fs-copy-flags-src.txt";
const dest = "/tmp/tsc2c-fs-copy-flags-dest.txt";
const DEFAULT_COPY_FLAGS = undefined;
const EXCLUSIVE_COPY_FLAGS = constants.COPYFILE_EXCL;
const events: string[] = [];

function note(label: string): void {
    events.push(label);
}

for (const file of [src, dest]) {
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
fs.promises.copyFile(src, dest, DEFAULT_COPY_FLAGS);
console.log("promise default alias:", fs.readFileSync(dest));

fs.writeFileSync(dest, "promise-void");
fs.promises.copyFile(src, dest, void 0);
console.log("promise void default:", fs.readFileSync(dest));

fs.writeFileSync(dest, "promise-side");
fs.promises.copyFile(src, dest, void note("promise-flags"));
console.log("promise side default:", fs.readFileSync(dest));

fs.promises.copyFile(src, dest, EXCLUSIVE_COPY_FLAGS).catch((reason: string): any => {
    console.log("promise excl:", reason);
});

console.log("events:", events.join("|"));
console.log("constants:", fs.constants.COPYFILE_EXCL, constants.COPYFILE_FICLONE, constants.COPYFILE_FICLONE_FORCE);

for (const file of [src, dest]) {
    if (fs.existsSync(file)) fs.rmSync(file);
}
