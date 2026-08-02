const events: string[] = [];
const file = "/tmp/tsc2c-fs-promises-stat-access-ignored.txt";
const defaultMode = undefined;

function mark(label: string): number {
    events.push(label);
    return 0;
}

fs.rmSync(file, { force: true });
fs.writeFileSync(file, "stats");

fs.promises.access(file, undefined, mark("access-default"));
fs.promises.access(file, void 0, mark("access-void-default"));
fs.promises.access(file, defaultMode, mark("access-alias-default"));
fs.promises.access(file, fs.constants.F_OK, mark("access-mode"));

let statIsFile = false;
let statSize = 0;
let lstatIsFile = false;
let lstatSize = 0;
let missing = false;

fs.promises.stat(file, void 0, mark("stat")).then((value: FSStats): void => {
    statIsFile = value.isFile();
    statSize = value.size;
});

fs.promises.lstat(file, void 0, mark("lstat")).then((value: FSStats): void => {
    lstatIsFile = value.isFile();
    lstatSize = value.size;
});

fs.promises.stat(file + ".missing", { throwIfNoEntry: false }, mark("missing")).then((value: FSStats | undefined): void => {
    missing = value === undefined;
});

console.log("events:", events.join("|"));
setImmediate((): void => {
    console.log("stat:", statIsFile, statSize);
    console.log("lstat:", lstatIsFile, lstatSize);
    console.log("missing:", missing);
    fs.rmSync(file, { force: true });
});
