import { promises as fsp, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";

const root = "/tmp/tsc2c-fs-promises-readdir-dirents-libuv";
const missing = root + "-missing";
const nested = root + "/a/b";

rmSync(root, { recursive: true, force: true });
rmSync(missing, { recursive: true, force: true });
mkdirSync(nested, { recursive: true });
writeFileSync(root + "/top.txt", "top");
writeFileSync(root + "/a/file.txt", "file");
writeFileSync(nested + "/deep.txt", "deep");
symlinkSync("a", root + "/link", "dir");

let completed = false;
let shallow = "pending";
let recursive = "pending";
let encoded = "pending";
let error = "pending";

function describe(entries: FSDirent[]): string {
    const names: string[] = [];
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        names.push(entry.name + ":" + entry.isFile() + ":" + entry.isDirectory() + ":" + entry.isSymbolicLink());
    }
    return names.sort().join("|");
}

fsp.readdir(root, { withFileTypes: true })
    .then((entries: FSDirent[]): void => {
        shallow = describe(entries);
        fsp.readdir(root, { withFileTypes: true, recursive: true })
            .then((entries: FSDirent[]): void => {
                recursive = describe(entries);
                fsp.readdir(root, { withFileTypes: true, encoding: "hex" })
                    .then((entries: FSDirent[]): void => {
                        encoded = describe(entries);
                        fsp.readdir(missing, { withFileTypes: true })
                            .then(
                                (_entries: FSDirent[]): void => {
                                    error = "unexpected success";
                                },
                                (reason: string): void => {
                                    error = reason;
                                },
                            )
                            .then((_value: any): void => {
                                completed = true;
                                console.log("completed:", completed);
                                console.log("shallow:", shallow);
                                console.log("recursive:", recursive);
                                console.log("encoded:", encoded);
                                console.log("error:", error);
                                rmSync(root, { recursive: true, force: true });
                            });
                    });
            });
    });

console.log("queued:", completed);
