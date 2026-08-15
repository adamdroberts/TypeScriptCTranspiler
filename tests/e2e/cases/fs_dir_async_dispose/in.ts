import fs from "node:fs";
import { opendir } from "node:fs/promises";

const root = "/tmp/tsc2c-fs-dir-async-dispose";

async function disposeWithUsing(dir: FSDir): Promise<void> {
    await using resource: FSDir = dir;
    console.log("using symbol:", typeof resource[Symbol.asyncDispose]);
}

async function main(): Promise<void> {
    fs.rmSync(root, { recursive: true, force: true });
    fs.mkdirSync(root);
    fs.writeFileSync(root + "/entry.txt", "entry");

    const dir = await opendir(root);
    console.log("symbol:", typeof Symbol.asyncDispose, typeof dir[Symbol.asyncDispose]);
    await dir[Symbol.asyncDispose]();

    let explicitClosed = false;
    try {
        await dir.read();
    } catch (reason) {
        explicitClosed = String(reason).indexOf("fs.Dir is closed") >= 0;
    }
    await dir[Symbol.asyncDispose]();
    console.log("explicit:", explicitClosed);

    const usingDir = await opendir(root);
    disposeWithUsing(usingDir).then((_ignored: any): void => {
        usingDir.read()
            .then((_entry: any): void => {
                console.log("using closed:", false);
                fs.rmSync(root, { recursive: true, force: true });
            })
            .catch((reason: any): void => {
                const usingClosed = String(reason).indexOf("fs.Dir is closed") >= 0;
                console.log("using closed:", usingClosed);
                fs.rmSync(root, { recursive: true, force: true });
            });
    });
}

main().catch((reason: any): void => console.log("error:", reason));
