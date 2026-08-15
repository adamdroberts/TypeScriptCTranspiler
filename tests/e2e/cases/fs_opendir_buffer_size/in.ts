import fs from "node:fs";

const root = "/tmp/tsc2c-fs-opendir-buffer-size";

function collectSync(dir: FSDir): string[] {
    const entries: string[] = [];
    let entry = dir.readSync();
    while (entry !== null) {
        const name = typeof entry.name === "string" ? entry.name : entry.name.toString();
        entries.push(name + "@" + entry.parentPath);
        entry = dir.readSync();
    }
    return entries.sort();
}

async function collectAsync(dir: FSDir): Promise<string[]> {
    const entries: string[] = [];
    let entry = await dir.read();
    while (entry !== null) {
        const name = typeof entry.name === "string" ? entry.name : entry.name.toString();
        entries.push(name + "@" + entry.parentPath);
        entry = await dir.read();
    }
    return entries.sort();
}

async function main(): Promise<void> {
    fs.rmSync(root, { recursive: true, force: true });
    fs.mkdirSync(root);
    fs.mkdirSync(root + "/nested");
    fs.writeFileSync(root + "/top.txt", "top");
    fs.writeFileSync(root + "/sibling.txt", "sibling");
    fs.writeFileSync(root + "/nested/deep.txt", "deep");

    const oneEntryOptions: FSDirOptions = { recursive: true, bufferSize: 1 };
    const syncDir = fs.opendirSync(root, oneEntryOptions);
    console.log("sync:", collectSync(syncDir).join("|"));
    syncDir.closeSync();

    const twoEntryOptions: FSDirOptions = { recursive: true, bufferSize: 2 };
    const asyncDir = await fs.promises.opendir(root, twoEntryOptions);
    console.log("async:", (await collectAsync(asyncDir)).join("|"));
    await asyncDir.close();

    fs.rmSync(root, { recursive: true, force: true });
}

main().catch((reason: any): void => console.log("error:", reason));
