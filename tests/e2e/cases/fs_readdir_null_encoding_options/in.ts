import { mkdirSync, promises, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), ".tmp-fs-readdir-null-encoding-options");
const NULL_ENCODING = null;
const NULL_OPTIONS = { encoding: NULL_ENCODING } as const;

rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });
writeFileSync(join(root, "alpha.txt"), "a");

const direct = readdirSync(root, NULL_ENCODING);
const object = fs.readdirSync(root, NULL_OPTIONS);

console.log("direct:", direct.join(","), typeof direct[0], Buffer.isBuffer(direct[0] as any));
console.log("object:", object.join(","), typeof object[0], Buffer.isBuffer(object[0] as any));

promises.readdir(root, NULL_OPTIONS).then((entries: string[]): void => {
    console.log("promise:", entries.join(","), typeof entries[0], Buffer.isBuffer(entries[0] as any));
    rmSync(root, { recursive: true, force: true });
});
