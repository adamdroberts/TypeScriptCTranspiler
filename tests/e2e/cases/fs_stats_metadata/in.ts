import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-stats-metadata";
const filePath = path.join(root, "note.txt");

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "meta");

function summarize(stat: FSStats): string {
    return [
        stat.dev >= 0,
        stat.ino > 0,
        stat.nlink >= 1,
        stat.uid >= 0,
        stat.gid >= 0,
        stat.rdev >= 0,
        stat.blksize >= 0,
        stat.blocks >= 0,
        stat.size,
        stat.mode > 0,
    ].join("/");
}

console.log("sync:", summarize(fs.statSync(filePath)));
console.log("lstat:", summarize(nodefs.lstatSync(filePath)));

fs.promises.stat(filePath).then((stat) => {
    console.log("promise:", summarize(stat));
    return stat;
});

fs.rmSync(root, { recursive: true, force: true });
