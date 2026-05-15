const syncPath = "/tmp/tsc2c-fs-write-file-flags-sync.txt";
const promisePath = "/tmp/tsc2c-fs-write-file-flags-promise.txt";
const exclusivePath = "/tmp/tsc2c-fs-write-file-flags-exclusive.txt";

for (const file of [syncPath, promisePath, exclusivePath]) {
    if (fs.existsSync(file)) fs.rmSync(file);
}

fs.writeFileSync(syncPath, "one");
fs.writeFileSync(syncPath, "-two", { flag: "a", encoding: "utf8" });
console.log("sync append:", fs.readFileSync(syncPath));

fs.writeFileSync(exclusivePath, "first", { flag: "wx" });
try {
    fs.writeFileSync(exclusivePath, "second", { flag: "wx" });
    console.log("sync exclusive: wrote");
} catch (err: any) {
    console.log("sync exclusive:", err);
}
console.log("sync exclusive content:", fs.readFileSync(exclusivePath));

fs.promises.writeFile(promisePath, "alpha");
fs.promises.writeFile(promisePath, Buffer.from("-beta"), { flag: "a" });
fs.promises.writeFile(promisePath, "again", { flag: "wx" }).catch((reason: string): any => {
    console.log("promise exclusive:", reason);
});
console.log("promise append:", fs.readFileSync(promisePath));

for (const file of [syncPath, promisePath, exclusivePath]) {
    if (fs.existsSync(file)) fs.rmSync(file);
}
