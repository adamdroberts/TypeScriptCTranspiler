import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-promises-rm-libuv";
const filePath = root + "/file.txt";
const missingPath = root + "/missing.txt";
const events: string[] = [];

function mark(label: string): void {
    events.push(label);
}

nodefs.rmSync(root, { recursive: true, force: true });
nodefs.mkdirSync(root);
nodefs.writeFileSync(filePath, "remove me");

nodefs.promises.rm(filePath, { force: false }, void mark("rm"))
    .then((_value: any): Promise<string> => {
        console.log("removed:", nodefs.existsSync(filePath));
        return nodefs.promises.rm(missingPath, { force: false }).then(
            (_unexpected: any): string => "unexpected success",
            (reason: string): string => reason,
        );
    })
    .then((reason: string): Promise<void> => {
        console.log("missing:", reason);
        return nodefs.promises.rm(missingPath, { force: true }, void mark("force"));
    })
    .then((_value: any): void => {
        console.log("force:", nodefs.existsSync(missingPath));
        console.log("events:", events.join("|"));
        nodefs.rmSync(root, { recursive: true, force: true });
    });

console.log("queued:", nodefs.existsSync(filePath));
