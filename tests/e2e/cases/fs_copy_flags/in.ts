import { constants } from "fs";

const src = "/tmp/tsc2c-fs-copy-flags-src.txt";
const dest = "/tmp/tsc2c-fs-copy-flags-dest.txt";

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

fs.promises.copyFile(src, dest, constants.COPYFILE_EXCL).catch((reason: string): any => {
    console.log("promise excl:", reason);
});

console.log("constants:", fs.constants.COPYFILE_EXCL, constants.COPYFILE_FICLONE, constants.COPYFILE_FICLONE_FORCE);

for (const file of [src, dest]) {
    if (fs.existsSync(file)) fs.rmSync(file);
}
