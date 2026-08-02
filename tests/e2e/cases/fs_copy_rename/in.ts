import * as nodefs from "node:fs";

const src = "/tmp/tsc2c-fs-copy-src.txt";
const copied = "/tmp/tsc2c-fs-copy-dest.txt";
const renamed = "/tmp/tsc2c-fs-copy-renamed.txt";
const promiseSrc = "/tmp/tsc2c-fs-pcopy-src.txt";
const promiseCopied = "/tmp/tsc2c-fs-pcopy-dest.txt";
const promiseRenamed = "/tmp/tsc2c-fs-pcopy-renamed.txt";

for (const file of [src, copied, renamed, promiseSrc, promiseCopied, promiseRenamed]) {
    if (nodefs.existsSync(file)) nodefs.rmSync(file);
}

nodefs.writeFileSync(src, "sync copy");
nodefs.copyFileSync(src, copied);
nodefs.renameSync(copied, renamed);

fs.promises.writeFile(promiseSrc, "promise copy")
    .then((_value: any) => fs.promises.copyFile(promiseSrc, promiseCopied))
    .then((_value: any) => fs.promises.rename(promiseCopied, promiseRenamed))
    .then((_value: any): void => {
        console.log("sync:", nodefs.readFileSync(renamed));
        console.log("promise:", nodefs.readFileSync(promiseRenamed));
        console.log("old copy exists:", nodefs.existsSync(copied));
        console.log("old promise copy exists:", nodefs.existsSync(promiseCopied));

        for (const file of [src, renamed, promiseSrc, promiseRenamed]) {
            if (nodefs.existsSync(file)) nodefs.rmSync(file);
        }
    });
