import fs from "node:fs";
import { opendir } from "node:fs/promises";

const root = "/tmp/tsc2c-fs-dirent-parent-path";

function summarize(entries: FSDirent[]): string {
    return entries.map((entry) => entry.name + ":" + (entry.parentPath === entry.path) + ":" + entry.parentPath).sort().join("|");
}

async function readHandle(dir: FSDir): Promise<string[]> {
    const entries: string[] = [];
    let entry = await dir.read();
    while (entry !== null) {
        entries.push(entry.name.toString() + ":" + (entry.parentPath === entry.path) + ":" + entry.parentPath);
        entry = await dir.read();
    }
    return entries.sort();
}

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root);
fs.mkdirSync(root + "/child");
fs.writeFileSync(root + "/root.txt", "root");
fs.writeFileSync(root + "/child/nested.txt", "nested");

const syncEntries = fs.readdirSync(root, { withFileTypes: true });
console.log("sync:", summarize(syncEntries));

const namedEntries = fs.readdirSync(root, { withFileTypes: true });
console.log("named:", summarize(namedEntries));

const first = syncEntries[0]!;
const descriptor = Object.getOwnPropertyDescriptor(first, "parentPath");
console.log(
    "reflect:",
    Object.keys(first).sort().join("|"),
    Object.entries(first).map((entry) => entry[0]).sort().join("|"),
    descriptor?.value === root,
    Reflect.get(first, "path") === root,
);

fs.promises.readdir(root, { withFileTypes: true })
    .then((promiseEntries: FSDirent[]): Promise<void> => {
        console.log("promise:", summarize(promiseEntries));

        const recursiveEntries = fs.readdirSync(root, { withFileTypes: true, recursive: true });
        console.log("recursive:", summarize(recursiveEntries));

        const syncDir = fs.opendirSync(root);
        const syncHandleEntries: string[] = [];
        let syncEntry = syncDir.readSync();
        while (syncEntry !== null) {
            syncHandleEntries.push(syncEntry.name.toString() + ":" + (syncEntry.parentPath === syncEntry.path) + ":" + syncEntry.parentPath);
            syncEntry = syncDir.readSync();
        }
        console.log("handle sync:", syncHandleEntries.sort().join("|"));
        syncDir.closeSync();

        const recursiveDir = fs.opendirSync(root, { recursive: true });
        return readHandle(recursiveDir)
            .then((entries): Promise<void> => {
                console.log("handle recursive:", entries.join("|"));
                return recursiveDir.close();
            });
    })
    .then((_value: any): Promise<void> => opendir(root).then((asyncDir) =>
        readHandle(asyncDir)
            .then((entries): Promise<void> => {
                console.log("handle async:", entries.join("|"));
                return asyncDir.close();
            })
    ))
    .then((_value: any): void => fs.rmSync(root, { recursive: true, force: true }))
    .catch((reason: any): void => {
        console.log("error:", reason);
        fs.rmSync(root, { recursive: true, force: true });
    });
