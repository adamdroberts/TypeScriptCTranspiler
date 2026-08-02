import { chmodSync, copyFileSync, linkSync, renameSync, truncateSync } from "node:fs";

const events: string[] = [];
const root = "/tmp/tsc2c-fs-mutation-ignored";
const copyRoot = "/tmp/tsc2c-fs-mutation-ignored-copy";
const syncDir = path.join(root, "sync");
const promiseDir = path.join(root, "promise");
const syncFile = path.join(syncDir, "file.txt");
const syncCopy = path.join(syncDir, "copy.txt");
const syncRenamed = path.join(syncDir, "renamed.txt");
const syncHard = path.join(syncDir, "hard.txt");
const syncLink = path.join(syncDir, "link.txt");
const syncEmpty = path.join(syncDir, "empty");
const promiseFile = path.join(promiseDir, "file.txt");
const promiseCopy = path.join(promiseDir, "copy.txt");
const promiseRenamed = path.join(promiseDir, "renamed.txt");
const promiseHard = path.join(promiseDir, "hard.txt");
const promiseLink = path.join(promiseDir, "link.txt");
const promiseEmpty = path.join(promiseDir, "empty");
const promiseCopyRoot = path.join(copyRoot, "promise");
const defaultLength = undefined;

function mark(label: string): string {
    events.push(label);
    return label;
}

fs.rmSync(root, { recursive: true, force: true });
fs.rmSync(copyRoot, { recursive: true, force: true });

fs.mkdirSync(syncDir, { recursive: true }, mark("mkdir"));
fs.mkdirSync(syncEmpty);
fs.writeFileSync(syncFile, "abcdef");
copyFileSync(syncFile, syncCopy, void 0, mark("copy"));
renameSync(syncCopy, syncRenamed, mark("rename"));
linkSync(syncRenamed, syncHard, mark("link"));
fs.symlinkSync(syncRenamed, syncLink, void 0, mark("symlink"));
truncateSync(syncRenamed, defaultLength, mark("truncate"));
fs.utimesSync(syncRenamed, 100, new Date(200000), mark("utimes"));
fs.lutimesSync(syncLink, 300, new Date(400000), mark("lutimes"));
chmodSync(syncRenamed, 0o600, mark("chmod"));
fs.cpSync(syncDir, copyRoot, { recursive: true }, mark("cp"));
fs.unlinkSync(syncHard, mark("unlink"));
fs.rmdirSync(syncEmpty, void 0, mark("rmdir"));
fs.rmSync(copyRoot, { recursive: true, force: true }, mark("rm"));

fs.promises.mkdir(promiseDir, { recursive: true }, mark("pmkdir"));
fs.promises.mkdir(promiseEmpty);
fs.writeFileSync(promiseFile, "abcdef");
let completion: Promise<any> = fs.promises.copyFile(promiseFile, promiseCopy, void 0, mark("pcopy"));
completion = completion.then((_value: any) => fs.promises.rename(promiseCopy, promiseRenamed, mark("prename")));
completion = completion.then((_value: any) => fs.promises.link(promiseRenamed, promiseHard, mark("plink")));
completion = completion.then((_value: any) => fs.promises.symlink(promiseRenamed, promiseLink, void 0, mark("psymlink")));
completion = completion.then((_value: any) => {
    fs.promises.truncate(promiseRenamed, defaultLength, mark("ptruncate"));
    return fs.promises.utimes(promiseRenamed, 500, new Date(600000), mark("putimes"));
});
completion = completion.then((_value: any) => fs.promises.lutimes(promiseLink, 700, new Date(800000), mark("plutimes")));
completion = completion.then((_value: any) => fs.promises.chmod(promiseRenamed, 0o600, mark("pchmod")));
completion.then((_value: any) => {
    fs.promises.cp(promiseDir, promiseCopyRoot, { recursive: true }, mark("pcp"));
    fs.promises.unlink(promiseHard, mark("punlink"));
    fs.promises.rmdir(promiseEmpty, void 0, mark("prmdir"));
    fs.promises.rm(promiseCopyRoot, { recursive: true, force: true }, mark("prm"));
    console.log("sync:", fs.readFileSync(syncRenamed).length, fs.lstatSync(syncLink).isSymbolicLink(), fs.existsSync(syncHard), fs.existsSync(syncEmpty), fs.existsSync(copyRoot));
    console.log("promise:", fs.readFileSync(promiseRenamed).length, fs.lstatSync(promiseLink).isSymbolicLink(), fs.existsSync(promiseHard), fs.existsSync(promiseEmpty), fs.existsSync(promiseCopyRoot));
    console.log("events:", events.join("|"));

    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(copyRoot, { recursive: true, force: true });
});
