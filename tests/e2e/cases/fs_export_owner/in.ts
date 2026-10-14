import fs from "node:fs";
import * as namespace from "node:fs";
import promises from "node:fs/promises";
const path = "/tmp/tsc2c-fs-export-owner-cli.txt";
const owner: any = fs;
const write: any = owner.writeFileSync;
write(path, "first", "utf8", 17);
const original: any = owner.readFileSync;
owner.readFileSync = (): string => "replacement";
console.log("lookup:", fs.readFileSync(path), namespace.readFileSync(path, "utf8"));
owner.readFileSync = original;
promises.appendFile(path, "second", "utf8").then(async (): Promise<void> => {
    console.log("retained:", await promises.readFile(path, "utf8"));
    const handle: any = await promises.open(path, "r");
    const stat: any = handle.stat;
    console.log("published:", (await stat.call(handle)).isFile());
    await handle.close();
    fs.rmSync(path);
});
