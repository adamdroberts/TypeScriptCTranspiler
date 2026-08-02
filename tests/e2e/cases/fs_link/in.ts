import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-link-root";
const filePath = root + "/file.txt";
const syncLink = root + "/sync-link.txt";
const promiseLink = root + "/promise-link.txt";
const missingLink = root + "/missing-parent/promise-link.txt";

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "linked");

fs.linkSync(filePath, syncLink);

console.log("sync:", fs.readFileSync(syncLink));
nodefs.promises.link(filePath, promiseLink).then((_value: any): Promise<string> => {
    console.log("promise:", nodefs.readFileSync(promiseLink));
    return nodefs.promises.link(filePath, missingLink).then(
        (_unexpected: any): string => "unexpected success",
        (reason: string): string => reason,
    );
}).then((reason: string): void => {
    console.log("missing:", reason);
    fs.rmSync(root, { recursive: true, force: true });
});
