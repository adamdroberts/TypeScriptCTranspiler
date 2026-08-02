import { promises as fsp, mkdirSync, rmSync, writeFileSync } from "node:fs";

const root = "/tmp/tsc2c-fs-promises-readdir-encoded-libuv";
const missing = root + "-missing";
const nested = root + "/sub";

rmSync(root, { recursive: true, force: true });
rmSync(missing, { recursive: true, force: true });
mkdirSync(nested, { recursive: true });
writeFileSync(root + "/a.txt", "a");
writeFileSync(nested + "/b.txt", "b");

let completed = false;
let shallowHex = "pending";
let shallowBase64 = "pending";
let recursiveHex = "pending";
let recursiveBase64 = "pending";
let error = "pending";

fsp.readdir(root, { encoding: "hex" }).then((entries: string[]): void => {
    shallowHex = entries.sort().join("|");
    fsp.readdir(root, { encoding: "base64" }).then((entries: string[]): void => {
        shallowBase64 = entries.sort().join("|");
        fsp.readdir(root, { recursive: true, encoding: "hex" }).then((entries: string[]): void => {
            recursiveHex = entries.sort().join("|");
            fsp.readdir(root, { recursive: true, encoding: "base64" }).then((entries: string[]): void => {
                recursiveBase64 = entries.sort().join("|");
                fsp.readdir(missing, { encoding: "hex" }).then(
                    (_entries: string[]): void => {
                        error = "unexpected success";
                    },
                    (reason: string): void => {
                        error = reason;
                    },
                ).then((_value: any): void => {
                    completed = true;
                    console.log("completed:", completed);
                    console.log("shallow hex:", shallowHex);
                    console.log("shallow base64:", shallowBase64);
                    console.log("recursive hex:", recursiveHex);
                    console.log("recursive base64:", recursiveBase64);
                    console.log("error:", error);
                    rmSync(root, { recursive: true, force: true });
                });
            });
        });
    });
});

console.log("queued:", completed);
