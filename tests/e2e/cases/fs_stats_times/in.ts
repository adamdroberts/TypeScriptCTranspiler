import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-stats-times";
const filePath = path.join(root, "note.txt");

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "times");

function summarize(stat: FSStats): string {
    return [
        stat.atimeMs > 0,
        stat.mtimeMs > 0,
        stat.ctimeMs > 0,
        stat.birthtimeMs > 0,
    ].join("/");
}

function summarizeDates(stat: FSStats): string {
    return [
        stat.atime.getTime() > 0,
        stat.mtime.getTime() > 0,
        stat.ctime.getTime() > 0,
        stat.birthtime.getTime() > 0,
    ].join("/");
}

const syncStat = fs.statSync(filePath);
const syncLstat = nodefs.lstatSync(filePath);
console.log("sync:", summarize(syncStat));
console.log("lstat:", summarize(syncLstat));
console.log("dates:", summarizeDates(syncStat));

fs.promises.stat(filePath).then((stat) => {
    console.log("promise:", summarize(stat));
    console.log("promise dates:", summarizeDates(stat));
    return stat;
});

fs.rmSync(root, { recursive: true, force: true });
