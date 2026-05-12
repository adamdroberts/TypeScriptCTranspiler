import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-lstat-root";
const dirPath = root + "/dir";
const filePath = dirPath + "/file.txt";

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(dirPath, { recursive: true });
fs.writeFileSync(filePath, "hello");

const fileStat = fs.lstatSync(filePath);
const dirStat = nodefs.lstatSync(dirPath);
const linkStat = fs.lstatSync("/proc/self/exe");
const targetStat = fs.statSync("/proc/self/exe");
let promiseLink = false;

nodefs.promises.lstat("/proc/self/exe").then((stat: FSStats): FSStats => {
    promiseLink = stat.isSymbolicLink();
    return stat;
});

console.log("file:", fileStat.isFile(), fileStat.isDirectory(), fileStat.isSymbolicLink());
console.log("dir:", dirStat.isFile(), dirStat.isDirectory(), dirStat.isSymbolicLink());
console.log("link:", linkStat.isFile(), linkStat.isDirectory(), linkStat.isSymbolicLink(), targetStat.isFile());
console.log("promise:", promiseLink);

fs.rmSync(root, { recursive: true, force: true });
