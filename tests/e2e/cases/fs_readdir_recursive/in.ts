import * as nodefs from "node:fs";
import { readdirSync } from "node:fs";

const root = "/tmp/tsc2c-fs-readdir-recursive";
const nested = root + "/a/b";

function summarize(names: string[]): string {
    names.sort();
    return [
        names.includes("a"),
        names.includes("a/b"),
        names.includes("a/b/deep.txt"),
        names.includes("a/file.txt"),
        names.includes("top.txt"),
        names.length,
    ].join("/");
}

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(root + "/top.txt", "top");
fs.writeFileSync(root + "/a/file.txt", "file");
fs.writeFileSync(nested + "/deep.txt", "deep");

const syncNames = fs.readdirSync(root, { recursive: true });
console.log("sync:", summarize(syncNames));

const namedNames = readdirSync(root, { recursive: true, encoding: "utf8" });
console.log("named:", summarize(namedNames));

(nodefs.promises.readdir(root, { recursive: true, signal: (console.log("signal option"), undefined) } as any) as unknown as Promise<string[]>).then((names: string[]): string => {
    console.log("promise:", summarize(names));
    fs.rmSync(root, { recursive: true, force: true });
    return "done";
});
