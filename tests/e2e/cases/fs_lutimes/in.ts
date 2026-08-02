import * as nodefs from "node:fs";
import { lutimesSync } from "node:fs";

const root = "/tmp/tsc2c-fs-lutimes";
const targetPath = path.join(root, "target.txt");
const linkPath = path.join(root, "link.txt");
const missingPath = path.join(root, "missing", "link.txt");

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(targetPath, "target");
fs.symlinkSync(targetPath, linkPath, "file");
fs.utimesSync(targetPath, 100, 100);

function linkTimes(): string {
    const stat = fs.lstatSync(linkPath);
    return Math.round(stat.atimeMs).toString() + "/" + Math.round(stat.mtimeMs).toString();
}

function targetMtime(): string {
    return Math.round(fs.statSync(targetPath).mtimeMs).toString();
}

lutimesSync(linkPath, 11, new Date(12000));
console.log("sync: " + linkTimes() + " target: " + targetMtime());

nodefs.promises.lutimes(linkPath, new Date(21000), 22).then((value: any): Promise<string> => {
    console.log("promise: " + linkTimes() + " target: " + targetMtime());
    return nodefs.promises.lutimes(missingPath, 1, 2).then(
        (_unexpected: any): string => "unexpected success",
        (reason: string): string => reason,
    );
}).then((reason: string): void => {
    console.log("missing: " + reason);
    fs.rmSync(root, { recursive: true, force: true });
});
