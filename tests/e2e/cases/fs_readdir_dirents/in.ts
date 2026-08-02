import * as nodefs from "node:fs";
import { readdirSync } from "node:fs";

const root = "/tmp/tsc2c-fs-readdir-dirents";
const filePath = root + "/file.txt";
const dirPath = root + "/dir";
const nestedPath = dirPath + "/nested.txt";
const linkPath = root + "/link.txt";
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

function summarize(entries: FSDirent[]): string {
    let files = 0;
    let dirs = 0;
    let links = 0;
    let names = 0;
    let specials = 0;
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.name.length > 0) names++;
        if (entry.isFile()) files++;
        if (entry.isDirectory()) dirs++;
        if (entry.isSymbolicLink()) links++;
        if (entry.isBlockDevice()) specials++;
        if (entry.isCharacterDevice()) specials++;
        if (entry.isFIFO()) specials++;
        if (entry.isSocket()) specials++;
    }
    return files + "/" + dirs + "/" + links + "/" + names + "/" + specials + "/" + entries[0].toString();
}

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "file");
fs.mkdirSync(dirPath);
fs.writeFileSync(nestedPath, "nested");
fs.symlinkSync(filePath, linkPath, "file");

const syncEntries = fs.readdirSync(root, { withFileTypes: true });
console.log("sync:", summarize(syncEntries));
let fileEntry = syncEntries[0];
for (let i = 0; i < syncEntries.length; i++) {
    if (syncEntries[i].name === "file.txt") fileEntry = syncEntries[i];
}
fileEntry.valueOf(mark("v"));
console.log("ignored:", fileEntry.isFile(mark("f")), fileEntry.toString(mark("s")), fileEntry.toLocaleString(mark("l")), seen);

const namedEntries = readdirSync(root, { withFileTypes: true, encoding: "utf8" });
console.log("named:", summarize(namedEntries));

const recursiveEntries = fs.readdirSync(root, { withFileTypes: true, recursive: true });
console.log("recursive:", summarize(recursiveEntries));

nodefs.promises.readdir(root, { withFileTypes: true })
    .then((entries: FSDirent[]): Promise<FSDirent[]> => {
        console.log("promise:", summarize(entries));
        return nodefs.promises.readdir(root, { withFileTypes: true, recursive: true });
    })
    .then((entries: FSDirent[]): void => {
        console.log("promise recursive:", summarize(entries));
        fs.rmSync(root, { recursive: true, force: true });
    });
