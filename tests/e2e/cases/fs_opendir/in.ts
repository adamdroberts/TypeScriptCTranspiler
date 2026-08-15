import fs from "node:fs";
import { opendirSync } from "node:fs";
import { opendir } from "node:fs/promises";

const root = "/tmp/tsc2c-fs-opendir";

async function main(): Promise<void> {
    fs.rmSync(root, { recursive: true, force: true });
    fs.mkdirSync(root);
    fs.writeFileSync(root + "/entry.txt", "entry");

    const syncDir = opendirSync(root);
    const syncEntry = syncDir.readSync();
    const syncEnd = syncDir.readSync();
    console.log("sync:", syncDir.path === root, syncEntry?.name, syncEntry?.isFile(), syncEnd === null);
    syncDir.closeSync();

    let syncClosed = false;
    try {
        syncDir.readSync();
    } catch (_reason) {
        syncClosed = true;
    }
    console.log("sync closed:", syncClosed);

    const asyncDir = await opendir(root);
    const asyncEntry = await asyncDir.read();
    const asyncEnd = await asyncDir.read();
    console.log("async:", asyncDir.path === root, asyncEntry?.name, asyncEntry?.isFile(), asyncEnd === null);

    const iteratorDir = await fs.promises.opendir(root);
    const iterator = iteratorDir[Symbol.asyncIterator]();
    const first = await iterator.next();
    const end = await iterator.next();
    console.log("iterator:", iterator === iteratorDir, first.done, first.value !== undefined, end.done, end.value === undefined);
    const returned = await iterator.return("done");
    console.log("return:", returned.value, returned.done);

    let asyncClosed = false;
    try {
        await iteratorDir.read();
    } catch (_reason) {
        asyncClosed = true;
    }
    console.log("async closed:", asyncClosed);

    await asyncDir.close();
    fs.rmSync(root, { recursive: true, force: true });
}

main().catch((reason: any): void => console.log("error:", reason));
