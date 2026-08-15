import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { opendir } from "node:fs/promises";

declare const AbortController: { new(): any };

const root = "/tmp/tsc2c-fs-opendir-abort-libuv";
rmSync(root, { recursive: true, force: true });
mkdirSync(root);
writeFileSync(root + "/entry.txt", "entry");

const pendingController: any = new AbortController();
const pending = opendir(root, { signal: pendingController.signal });
const preController: any = new AbortController();
preController.abort("pre-stop");
const pre = opendir(root, { signal: preController.signal });

pendingController.abort("pending-stop");

pending.then(
    (_dir: FSDir): void => console.log("pending: completed"),
    (reason: any): void => console.log("pending:", reason),
).then((_ignored: any): Promise<void> => {
    return pre.then(
        (_dir: FSDir): void => console.log("pre: completed"),
        (reason: any): void => console.log("pre:", reason),
    );
}).then((_ignored: any): Promise<void> => {
    const lateController: any = new AbortController();
    return opendir(root, { recursive: true, signal: lateController.signal }).then((dir: FSDir): Promise<void> => {
        lateController.abort("late-stop");
        return dir.read().then((entry: FSDirHandleEntry | null): Promise<void> => {
            return dir.close().then((_ignored: any): void => {
                console.log("late:", entry !== null, dir.path === root);
            });
        });
    });
}).then((_ignored: any): void => {
    rmSync(root, { recursive: true, force: true });
});
