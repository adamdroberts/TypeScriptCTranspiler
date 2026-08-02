import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-truncate-root";
const filePath = root + "/file.txt";
const missingPath = root + "/missing/file.txt";

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "abcdef");

fs.truncateSync(filePath, 3);
console.log("sync:", fs.statSync(filePath).size);

nodefs.promises.truncate(filePath, 1).then((_value: any): Promise<string> => {
    console.log("promise:", nodefs.statSync(filePath).size);
    return nodefs.promises.truncate(missingPath, 2).then(
        (_unexpected: any): string => "unexpected success",
        (reason: string): string => reason,
    );
}).then((reason: string): void => {
    console.log("missing:", reason);
    fs.rmSync(root, { recursive: true, force: true });
});

console.log("queued:", nodefs.statSync(filePath).size);
