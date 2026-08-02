import { promises as fsp, readFileSync, rmSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-write-file-libuv.txt";
rmSync(path, { force: true });

let completed = false;
let content = "pending";
let error = "pending";

fsp.writeFile(path, "one\n")
    .then((_value: any) => fsp.appendFile(path, Buffer.from("two\n"), { flag: "a" }))
    .then((_value: any) => fsp.writeFile(path, "3334", { encoding: "hex", flag: "a" }))
    .then((_value: any) => fsp.readFile(path, "buffer"))
    .then((bytes: Buffer): Promise<void> => {
        content = `${bytes.length}:${bytes.toString().replace(/\n/g, "|")}`;
        return fsp.writeFile(path, "again", { flag: "wx" });
    })
    .catch((reason: string): void => {
        error = reason;
    })
    .then((_value: any): void => {
        completed = true;
    });

setImmediate((): void => {
    console.log("completed:", completed);
    console.log("content:", content);
    console.log("error:", error);
    rmSync(path, { force: true });
});
