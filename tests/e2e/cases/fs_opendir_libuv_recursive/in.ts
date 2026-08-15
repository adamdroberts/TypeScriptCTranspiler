import fs from "node:fs";
import { opendir } from "node:fs/promises";

const root = "/tmp/tsc2c-fs-opendir-libuv-recursive";

function readFour(dir: FSDir, entries: string[]): Promise<FSDirHandleEntry | null> {
    return dir.read().then((entry: FSDirHandleEntry | null): Promise<FSDirHandleEntry | null> => {
        if (entry !== null) entries.push(entry.name.toString() + "@" + entry.parentPath);
        return dir.read();
    }).then((entry: FSDirHandleEntry | null): Promise<FSDirHandleEntry | null> => {
        if (entry !== null) entries.push(entry.name.toString() + "@" + entry.parentPath);
        return dir.read();
    }).then((entry: FSDirHandleEntry | null): Promise<FSDirHandleEntry | null> => {
        if (entry !== null) entries.push(entry.name.toString() + "@" + entry.parentPath);
        return dir.read();
    });
}

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root);
fs.mkdirSync(root + "/nested");
fs.writeFileSync(root + "/alpha.txt", "alpha");
fs.writeFileSync(root + "/nested/beta.txt", "beta");

opendir(root, { recursive: true, encoding: "hex", bufferSize: 2 }).then((dir: FSDir): Promise<void> => {
    const entries: string[] = [];
    return readFour(dir, entries).then((end: FSDirHandleEntry | null): Promise<void> => {
        return dir.close().then((_ignored: any): void => {
            console.log("async:", dir.path === root, entries.sort().join("|"), end === null);
        });
    });
}).then((_ignored: any): Promise<void> => {
    return opendir(root, { recursive: true, bufferSize: 1 }).then((dir: FSDir): Promise<void> => {
        let count = 0;
        if (dir.readSync() !== null) count++;
        if (dir.readSync() !== null) count++;
        if (dir.readSync() !== null) count++;
        const end = dir.readSync();
        return dir.close().then((_closeIgnored: any): void => {
            console.log("sync:", count, end === null);
        });
    });
}).then((_ignored: any): void => {
    fs.rmSync(root, { recursive: true, force: true });
});
