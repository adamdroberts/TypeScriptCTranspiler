import * as nodefs from "node:fs";

const dirPath = "/tmp/tsc2c-fs-stat-dir";
const filePath = path.join(dirPath, "note.txt");
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

if (nodefs.existsSync(filePath)) nodefs.rmSync(filePath);
if (nodefs.existsSync(dirPath)) nodefs.rmdirSync(dirPath);

nodefs.mkdirSync(dirPath);
fs.writeFileSync(filePath, "hello");

const fileStat = nodefs.statSync(filePath);
const dirStat = fs.statSync(dirPath);

console.log("file:", fileStat.isFile(), fileStat.isDirectory(), fileStat.size);
console.log("dir:", dirStat.isFile(), dirStat.isDirectory(), dirStat.size >= 0);
console.log("string:", fileStat.toString());
fileStat.valueOf(mark("v"));
console.log("ignored:", fileStat.isFile(mark("f")), fileStat.isDirectory(mark("d")), fileStat.toString(mark("s")), fileStat.toLocaleString(mark("l")), seen);

fs.promises.stat(filePath).then((stat) => {
    console.log("promise:", stat.isFile(), stat.isDirectory(), stat.size);
    return stat;
});

Promise.resolve(fileStat).then((stat) => {
    console.log("resolve:", stat.isFile(), stat.size);
    return stat;
});

nodefs.rmSync(filePath);
nodefs.rmdirSync(dirPath);
