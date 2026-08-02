import * as nodefs from "node:fs";

const syncPath = "/tmp/tsc2c-fs-buffer-sync.bin";
const promisePath = "/tmp/tsc2c-fs-buffer-promise.bin";

fs.rmSync(syncPath, { force: true });
fs.rmSync(promisePath, { force: true });

fs.writeFileSync(syncPath, Buffer.from([0, 65, 255]));
nodefs.appendFileSync(syncPath, Buffer.from("4263", "hex"));
const syncRead = Buffer.from(fs.readFileSync(syncPath));
console.log("sync:", syncRead.length, syncRead.toString("hex"));

fs.promises.writeFile(promisePath, Buffer.from("4869", "hex"))
    .then((_value: any) => nodefs.promises.appendFile(promisePath, Buffer.from([33])))
    .then((_value: any): void => {
        const promiseRead = Buffer.from(fs.readFileSync(promisePath));
        console.log("promise:", promiseRead.length, promiseRead.toString("hex"));

        fs.rmSync(syncPath, { force: true });
        fs.rmSync(promisePath, { force: true });
    });
