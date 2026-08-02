import * as nodefs from "node:fs";

const syncPrefix = "/tmp/tsc2c-mkdtemp-sync-";
const promisePrefix = "/tmp/tsc2c-mkdtemp-promise-";
const missingPrefix = "/tmp/tsc2c-mkdtemp-missing-parent/prefix-";
const syncDir = fs.mkdtempSync(syncPrefix);

nodefs.promises.mkdtemp(promisePrefix).then((dir: string): Promise<string> => {
    console.log("promise:", dir.startsWith(promisePrefix), nodefs.statSync(dir).isDirectory());
    fs.rmSync(dir, { recursive: true, force: true });
    return nodefs.promises.mkdtemp(missingPrefix).then(
        (_missing: string): string => "unexpected success",
        (reason: string): string => reason,
    );
}).then((reason: string): void => {
    console.log("missing:", reason);
});

console.log("sync:", syncDir.startsWith(syncPrefix), fs.statSync(syncDir).isDirectory());
fs.rmSync(syncDir, { recursive: true, force: true });
setImmediate((): void => {});
