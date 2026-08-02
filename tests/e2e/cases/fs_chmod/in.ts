import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-chmod-root";
const filePath = root + "/file.txt";
const missingPath = root + "/missing/file.txt";

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "mode");

fs.chmodSync(filePath, 0o600);
console.log("sync:", fs.statSync(filePath).mode % 512);

nodefs.promises.chmod(filePath, 0o644).then((_value: any): Promise<string> => {
    console.log("promise:", nodefs.statSync(filePath).mode % 512);
    return nodefs.promises.chmod(missingPath, 0o644).then(
        (_unexpected: any): string => "unexpected success",
        (reason: string): string => reason,
    );
}).then((reason: string): void => {
    console.log("missing:", reason);
    fs.rmSync(root, { recursive: true, force: true });
});
