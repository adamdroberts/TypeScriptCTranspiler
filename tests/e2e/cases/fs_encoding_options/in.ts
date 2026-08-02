import * as nodefs from "node:fs";

const syncPath = "/tmp/tsc2c-fs-encoding-sync.txt";
const promisePath = "/tmp/tsc2c-fs-encoding-promise.txt";

fs.rmSync(syncPath, { force: true });
fs.rmSync(promisePath, { force: true });

nodefs.writeFileSync(syncPath, "a", "utf8");
fs.appendFileSync(syncPath, "b", { encoding: "utf-8" });
console.log("sync:", fs.readFileSync(syncPath, { encoding: "utf8" }));

fs.promises.writeFile(promisePath, "x", { encoding: "utf8" })
    .then((_value: any) => fs.promises.appendFile(promisePath, "y", "utf-8"))
    .then((_value: any) => fs.promises.readFile(promisePath, "utf8"))
    .then((text: string): void => {
        console.log("promise:", text);
        fs.rmSync(syncPath, { force: true });
        fs.rmSync(promisePath, { force: true });
    });
