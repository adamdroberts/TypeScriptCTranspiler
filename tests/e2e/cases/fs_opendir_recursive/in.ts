import fs from "node:fs";

const root = "/tmp/tsc2c-fs-opendir-recursive";

function readSyncNames(dir: FSDir): string[] {
    const names: string[] = [];
    let entry = dir.readSync();
    while (entry !== null) {
        names.push(entry.name);
        entry = dir.readSync();
    }
    return names.sort();
}

async function readAsyncNames(dir: FSDir): Promise<string[]> {
    const names: string[] = [];
    let entry = await dir.read();
    while (entry !== null) {
        names.push(entry.name);
        entry = await dir.read();
    }
    return names.sort();
}

async function main(): Promise<void> {
    fs.rmSync(root, { recursive: true, force: true });
    fs.mkdirSync(root + "/nested", { recursive: true });
    fs.writeFileSync(root + "/top.txt", "top");
    fs.writeFileSync(root + "/sibling.txt", "sibling");
    fs.writeFileSync(root + "/nested/deep.txt", "deep");

    const recursiveOptions = { recursive: true };
    const syncDir = fs.opendirSync(root, recursiveOptions);
    console.log("sync:", readSyncNames(syncDir).join("|"));
    syncDir.closeSync();

    const flatDir = fs.opendirSync(root, { recursive: false });
    console.log("flat:", readSyncNames(flatDir).join("|"));
    flatDir.closeSync();

    const earlyDir = fs.opendirSync(root, { recursive: true });
    const first = earlyDir.readSync();
    earlyDir.closeSync();
    let earlyClosed = false;
    try {
        earlyDir.readSync();
    } catch (_reason) {
        earlyClosed = true;
    }
    console.log("early:", first !== null, earlyClosed);

    const asyncDir = await fs.promises.opendir(root, { recursive: true });
    console.log("async:", (await readAsyncNames(asyncDir)).join("|"));
    await asyncDir.close();

    fs.rmSync(root, { recursive: true, force: true });
}

main().catch((reason: any): void => console.log("error:", reason));
