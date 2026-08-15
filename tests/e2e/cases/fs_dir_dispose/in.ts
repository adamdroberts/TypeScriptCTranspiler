import fs from "node:fs";

const root = "/tmp/tsc2c-fs-dir-dispose";

function disposeWithUsing(dir: FSDir): void {
    using resource: FSDir = dir;
    console.log("using symbol:", typeof resource[Symbol.dispose]);
}

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root);
fs.writeFileSync(root + "/entry.txt", "entry");

const dir = fs.opendirSync(root);
console.log("symbol:", typeof Symbol.dispose, typeof dir[Symbol.dispose]);
dir[Symbol.dispose]();

let explicitClosed = false;
try {
    dir.readSync();
} catch (reason) {
    explicitClosed = String(reason).indexOf("fs.Dir is closed") >= 0;
}
dir[Symbol.dispose]();
console.log("explicit:", explicitClosed);

const usingDir = fs.opendirSync(root);
disposeWithUsing(usingDir);

let usingClosed = false;
try {
    usingDir.readSync();
} catch (reason) {
    usingClosed = String(reason).indexOf("fs.Dir is closed") >= 0;
}
console.log("using closed:", usingClosed);

fs.rmSync(root, { recursive: true, force: true });
