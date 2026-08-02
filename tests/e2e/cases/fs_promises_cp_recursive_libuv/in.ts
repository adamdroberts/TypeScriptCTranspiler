import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-promises-cp-recursive-libuv";
const src = root + "/src";
const nested = src + "/nested";
const sourceFile = nested + "/file.txt";
const sourceLink = src + "/link.txt";
const dest = root + "/dest";
const destFile = dest + "/nested/file.txt";
const dereferenced = root + "/dereferenced.txt";

nodefs.rmSync(root, { recursive: true, force: true });
nodefs.mkdirSync(nested, { recursive: true });
nodefs.writeFileSync(sourceFile, "source");
nodefs.symlinkSync("nested/file.txt", sourceLink);
nodefs.utimesSync(sourceFile, 11, 12);
nodefs.mkdirSync(dest + "/nested", { recursive: true });
nodefs.writeFileSync(destFile, "old");

let settled = false;
let completion: Promise<any> = nodefs.promises.cp(src, dest, { recursive: true, force: false });
completion = completion.then((_value: any): Promise<any> => {
    settled = true;
    console.log("skip:", nodefs.readFileSync(destFile));
    console.log("link:", nodefs.lstatSync(dest + "/link.txt").isSymbolicLink());
    return nodefs.promises.cp(src, dest, {
        recursive: true,
        force: true,
        verbatimSymlinks: true,
        preserveTimestamps: true,
    });
});
completion = completion.then((_value: any): Promise<any> => {
    console.log("overwrite:", nodefs.readFileSync(destFile));
    console.log("preserved:", Math.round(nodefs.statSync(destFile).mtimeMs));
    return nodefs.promises.cp(sourceLink, dereferenced, { recursive: true, dereference: true });
});
completion = completion.then((_value: any): Promise<any> => {
    console.log("deref:", nodefs.lstatSync(dereferenced).isSymbolicLink(), nodefs.readFileSync(dereferenced));
    return nodefs.promises.cp(sourceFile, destFile, { recursive: true, force: false, errorOnExist: true });
}).catch((reason: string): void => {
    console.log("error:", reason);
});
completion.then((_value: any): void => {
    nodefs.rmSync(root, { recursive: true, force: true });
    console.log("done:", nodefs.existsSync(root));
});

console.log("queued:", settled, nodefs.existsSync(src));
