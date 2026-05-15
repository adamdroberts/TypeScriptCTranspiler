import * as nodefs from "node:fs";
import { utimesSync } from "node:fs";

const root = "/tmp/tsc2c-fs-utimes";
const filePath = path.join(root, "note.txt");

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "times");

function summarize(): string {
    const stat = fs.statSync(filePath);
    return Math.round(stat.atimeMs).toString() + "/" + Math.round(stat.mtimeMs).toString();
}

utimesSync(filePath, 11, new Date(12000));
console.log("sync:", summarize());

nodefs.promises.utimes(filePath, new Date(21000), 22).then((value: any): string => {
    console.log("promise:", summarize());
    return "done";
});

fs.rmSync(root, { recursive: true, force: true });
