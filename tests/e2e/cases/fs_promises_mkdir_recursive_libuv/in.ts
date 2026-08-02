import { promises as fsp, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";

const root = "/tmp/tsc2c-fs-promises-mkdir-recursive-libuv";
const nested = root + "/a/b";
const file = nested + "/note.txt";

rmSync(root, { recursive: true, force: true });

let completed = false;
let mode = "pending";
let existing = "pending";
let error = "pending";

fsp.mkdir(nested, { recursive: true, mode: 0o755 })
    .then((_value: any): Promise<any> => {
        mode = (statSync(nested).mode & 0o777).toString(8);
        return fsp.mkdir(nested, { recursive: true });
    })
    .then((_value: any): Promise<any> => {
        existing = "ok";
        writeFileSync(file, "file");
        return fsp.mkdir(file + "/child", { recursive: true });
    })
    .catch((reason: string): void => {
        error = reason;
    })
    .then((_value: any): void => {
        completed = true;
        console.log("completed:", completed);
        console.log("mode:", mode);
        console.log("existing:", existing);
        console.log("error:", error);
        rmSync(root, { recursive: true, force: true });
    });

console.log("queued:", completed);
