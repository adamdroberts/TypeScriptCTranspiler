import fs from "node:fs";
import { opendir } from "node:fs/promises";

const root = "/tmp/tsc2c-fs-opendir-libuv";

function readThree(dir: FSDir, names: string[]): Promise<FSDirHandleEntry | null> {
    return dir.read().then((entry: FSDirHandleEntry | null): Promise<FSDirHandleEntry | null> => {
        if (entry !== null) names.push(entry.name.toString());
        return dir.read();
    }).then((entry: FSDirHandleEntry | null): Promise<FSDirHandleEntry | null> => {
        if (entry !== null) names.push(entry.name.toString());
        return dir.read();
    });
}

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root);
fs.writeFileSync(root + "/alpha.txt", "alpha");
fs.writeFileSync(root + "/beta.txt", "beta");

opendir(root, { encoding: "hex", bufferSize: 1 }).then((dir: FSDir): Promise<void> => {
    const names: string[] = [];
    return readThree(dir, names).then((end: FSDirHandleEntry | null): Promise<void> => {
        return dir.close().then((_ignored: any): void => {
            console.log("async:", dir.path === root, names.sort().join("|"), end === null);
        });
    });
}).then((_ignored: any): Promise<void> => {
    return opendir(root).then((dir: FSDir): Promise<void> => {
        const iterator = dir[Symbol.asyncIterator]();
        return iterator.next().then((first: any): Promise<void> => {
            return iterator.return("done").then((returned: any): Promise<void> => {
                return dir.close().then((_closeIgnored: any): void => {
                    console.log("iterator:", iterator === dir, first.done, first.value !== undefined, returned.value, returned.done);
                });
            });
        });
    });
}).then((_ignored: any): Promise<void> => {
    return opendir(root, { bufferSize: 1 }).then((dir: FSDir): Promise<void> => {
        let count = 0;
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
