import { readFileSync, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-read-file-null-buffer-options.txt";

try {
    writeFileSync(path, "A\0B");

    const direct = readFileSync(path, null);
    const object = readFileSync(path, { encoding: null, flag: "r" });

    console.log("null:", direct.length, direct[0], direct[1], direct[2]);
    console.log("object:", object.length, object.toString("hex"));
    fs.promises.readFile(path, null).then((promise: Buffer): void => {
        console.log("promise null:", promise.length, promise.toString("hex"));
    });
} finally {
    try {
        rmSync(path, { force: true });
    } catch {
    }
}
