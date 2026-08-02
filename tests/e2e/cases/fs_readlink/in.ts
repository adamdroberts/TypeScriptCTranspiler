import * as nodefs from "node:fs";

const syncTarget = fs.readlinkSync("/proc/self/exe");
const missing = "/tmp/tsc2c-fs-readlink-missing.txt";
if (nodefs.existsSync(missing)) nodefs.rmSync(missing);

nodefs.promises.readlink("/proc/self/exe")
    .then((target: string) => {
        console.log("sync:", syncTarget.length > 0, syncTarget.indexOf("/") === 0);
        console.log("promise:", target.length > 0, target.indexOf("/") === 0);
        return nodefs.promises.readlink(missing)
            .then((_missing: string): string => "unexpected success", (reason: string): string => reason);
    })
    .then((reason: string): void => {
        console.log("missing:", reason);
    });
