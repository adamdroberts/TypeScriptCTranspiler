import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-realpath-root";
const nested = root + "/sub";

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(nested, { recursive: true });

const syncPath = fs.realpathSync(nested + "/..");

nodefs.promises.realpath(root + "/sub/..")
    .then((resolved: string) => {
        console.log("sync:", syncPath === root);
        console.log("promise:", resolved === root);
        return nodefs.promises.realpath(root + "/missing")
            .then((_missing: string): string => "unexpected success", (reason: string): string => reason);
    })
    .then((missing: string): void => {
        console.log("missing:", missing);
        fs.rmSync(root, { recursive: true, force: true });
    });
