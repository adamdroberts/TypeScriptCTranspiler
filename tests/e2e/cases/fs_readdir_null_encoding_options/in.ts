import { mkdirSync, promises, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), ".tmp-fs-readdir-null-encoding-options");

rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });
writeFileSync(join(root, "alpha.txt"), "a");

const direct = readdirSync(root, null);
const object = fs.readdirSync(root, { encoding: null });

console.log("direct:", direct.join(","), typeof direct[0], Buffer.isBuffer(direct[0] as any));
console.log("object:", object.join(","), typeof object[0], Buffer.isBuffer(object[0] as any));

promises.readdir(root, { encoding: null }).then((entries: string[]): void => {
    console.log("promise:", entries.join(","), typeof entries[0], Buffer.isBuffer(entries[0] as any));
    rmSync(root, { recursive: true, force: true });
});
