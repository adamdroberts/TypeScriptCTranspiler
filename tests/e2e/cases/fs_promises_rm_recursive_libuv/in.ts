import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-promises-rm-recursive-libuv";
const nested = root + "/nested/deep";
const filePath = nested + "/file.txt";
const linkPath = root + "/link.txt";
const missingPath = root + "/missing";

nodefs.rmSync(root, { recursive: true, force: true });
nodefs.mkdirSync(nested, { recursive: true });
nodefs.writeFileSync(filePath, "remove me");
nodefs.symlinkSync("nested/deep/file.txt", linkPath);

let settled = false;
nodefs.promises.rm(root, { recursive: true, force: false }).then((_value: any): Promise<any> => {
    settled = true;
    console.log("removed:", nodefs.existsSync(root), nodefs.existsSync(linkPath));
    return nodefs.promises.rm(missingPath, { recursive: true, force: false }).then((_missingValue: any): Promise<any> => {
        console.log("unexpected: success");
        return nodefs.promises.rm(missingPath, { recursive: true, force: true });
    }).catch((reason: string): Promise<any> => {
        console.log("missing:", reason);
        return nodefs.promises.rm(missingPath, { recursive: true, force: true });
    });
}).then((_value: any): void => {
    console.log("force:", nodefs.existsSync(missingPath));
});

console.log("queued:", settled, nodefs.existsSync(root));
