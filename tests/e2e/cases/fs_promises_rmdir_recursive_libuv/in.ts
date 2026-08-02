import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-promises-rmdir-recursive-libuv";
const nested = root + "/nested/deep";
const filePath = nested + "/file.txt";
const fileRoot = "/tmp/tsc2c-fs-promises-rmdir-recursive-libuv-file";

nodefs.rmSync(root, { recursive: true, force: true });
nodefs.rmSync(fileRoot, { force: true });
nodefs.mkdirSync(nested, { recursive: true });
nodefs.writeFileSync(filePath, "remove me");

let settled = false;
let completion: Promise<any> = nodefs.promises.rmdir(root, { recursive: true });
completion = completion.then((_value: any): Promise<any> => {
    settled = true;
    console.log("removed:", nodefs.existsSync(root), nodefs.existsSync(filePath));

    nodefs.writeFileSync(fileRoot, "not a directory");
    return nodefs.promises.rmdir(fileRoot, { recursive: true });
});
completion = completion.then((_value: any): Promise<any> => {
    console.log("unexpected: file accepted");
    return nodefs.promises.rmdir(fileRoot, { recursive: true });
}).catch((reason: string): void => {
    console.log("file:", reason);
    nodefs.rmSync(fileRoot, { force: true });
});
completion.then((_value: any): void => {
    console.log("done:", nodefs.existsSync(root), nodefs.existsSync(fileRoot));
});

console.log("queued:", settled, nodefs.existsSync(root));
