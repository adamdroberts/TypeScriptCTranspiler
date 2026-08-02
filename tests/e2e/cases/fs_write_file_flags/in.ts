const syncPath = "/tmp/tsc2c-fs-write-file-flags-sync.txt";
const promisePath = "/tmp/tsc2c-fs-write-file-flags-promise.txt";
const exclusivePath = "/tmp/tsc2c-fs-write-file-flags-exclusive.txt";
const updatePath = "/tmp/tsc2c-fs-write-file-flags-update.txt";

for (const file of [syncPath, promisePath, exclusivePath, updatePath]) {
    if (fs.existsSync(file)) fs.rmSync(file);
}

fs.writeFileSync(syncPath, "one");
fs.writeFileSync(syncPath, "-two", { flag: "a", encoding: "utf8" });
console.log("sync append:", fs.readFileSync(syncPath));

fs.writeFileSync(exclusivePath, "first", { flag: "wx+" });
try {
    fs.writeFileSync(exclusivePath, "second", { flag: "wx+" });
    console.log("sync exclusive: wrote");
} catch (err: any) {
    console.log("sync exclusive:", err);
}
console.log("sync exclusive content:", fs.readFileSync(exclusivePath));

fs.writeFileSync(updatePath, "abcdef");
fs.writeFileSync(updatePath, "XY", { flag: "r+" });
console.log("sync update:", fs.readFileSync(updatePath));
fs.writeFileSync(updatePath, "rst", { flag: "w+" });
fs.writeFileSync(updatePath, "-uv", { flag: "as+" });
console.log("sync plus flags:", fs.readFileSync(updatePath));

fs.promises.writeFile(promisePath, "alpha")
    .then((_value: any) => fs.promises.writeFile(promisePath, Buffer.from("-beta"), { flag: "a" }))
    .then((_value: any) => fs.promises.writeFile(promisePath, "Z", { flag: "r+" }))
    .then((_value: any) => fs.promises.writeFile(promisePath, "-tail", { flag: "a+" }))
    .then((_value: any) => fs.promises.writeFile(promisePath, "again", { flag: "wx+" }))
    .catch((reason: string): void => {
        console.log("promise exclusive:", reason);
    })
    .then((_value: any): void => {
        console.log("promise append:", fs.readFileSync(promisePath));
        for (const file of [syncPath, promisePath, exclusivePath, updatePath]) {
            if (fs.existsSync(file)) fs.rmSync(file);
        }
    });
