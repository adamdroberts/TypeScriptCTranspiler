import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-promises-cp-libuv";
const src = root + "/source.txt";
const dest = root + "/destination.txt";
const noForceDest = root + "/no-force-destination.txt";
const missing = root + "/missing.txt";

nodefs.rmSync(root, { recursive: true, force: true });
nodefs.mkdirSync(root, { recursive: true });
nodefs.writeFileSync(src, "source");

let completed = false;
nodefs.promises.cp(src, dest).then((_value: any): Promise<any> => {
    completed = true;
    console.log("promise:", nodefs.readFileSync(dest));
    return nodefs.promises.cp(src, noForceDest, { force: false });
}).then((_value: any): Promise<any> => {
    console.log("force false missing:", nodefs.readFileSync(noForceDest));
    return nodefs.promises.cp(missing, dest);
}).then((_value: any): void => {
    console.log("missing: copied");
    nodefs.rmSync(root, { recursive: true, force: true });
}, (reason: string): void => {
    console.log("missing:", reason);
    nodefs.rmSync(root, { recursive: true, force: true });
});

console.log("queued:", completed);
