import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-write-append-null-options";
const fileSync = root + "/sync.txt";
const filePromise = root + "/promise.txt";
const subDirSync = root + "/sub-sync";
const subDirPromise = root + "/sub-promise";

// Clean up
try {
    fs.rmSync(root, { recursive: true, force: true });
} catch (e) {}

// Test mkdirSync null
fs.mkdirSync(root, null);
fs.mkdirSync(subDirSync, null);
console.log("mkdirSync path exists:", fs.existsSync(subDirSync));

// Test writeFileSync / appendFileSync with null and { encoding: null }
fs.writeFileSync(fileSync, "write-sync-null", null);
nodefs.writeFileSync(fileSync, "write-sync-enc-null", { encoding: null });
fs.appendFileSync(fileSync, "|append-sync-null", null);
nodefs.appendFileSync(fileSync, "|append-sync-enc-null", { encoding: null });

console.log("sync content:");
console.log(fs.readFileSync(fileSync, "utf8"));

// Test promises.mkdir, promises.writeFile, promises.appendFile with null and { encoding: null }
fs.promises.mkdir(subDirPromise, null)
    .then((_mkdirRes: any): Promise<void> => {
        console.log("promises.mkdir path exists:", fs.existsSync(subDirPromise));
        return fs.promises.writeFile(filePromise, "write-promise-null", null);
    })
    .then((_writeRes1: any): Promise<void> => {
        return nodefs.promises.writeFile(filePromise, "write-promise-enc-null", { encoding: null });
    })
    .then((_writeRes2: any): Promise<void> => {
        return fs.promises.appendFile(filePromise, "|append-promise-null", null);
    })
    .then((_appendRes1: any): Promise<void> => {
        return nodefs.promises.appendFile(filePromise, "|append-promise-enc-null", { encoding: null });
    })
    .then((_appendRes2: any): Promise<string> => {
        return fs.promises.readFile(filePromise, "utf8");
    })
    .then((content: string): void => {
        console.log("promise content:");
        console.log(content);

        // Clean up
        fs.rmSync(root, { recursive: true, force: true });
    });
