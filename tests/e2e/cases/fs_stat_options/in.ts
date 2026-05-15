const root = "/tmp/tsc2c-fs-stat-options";
const filePath = path.join(root, "note.txt");

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "stats");

const stat = fs.statSync(filePath, { bigint: false });
const lstat = fs.lstatSync(filePath, { bigint: false });
console.log("sync:", stat.isFile(), lstat.isFile(), typeof stat.size, stat.size);

fs.promises.stat(filePath, { bigint: false }).then((promiseStat) => {
    console.log("promise stat:", promiseStat.isFile(), typeof promiseStat.size, promiseStat.size);
});

fs.promises.lstat(filePath, { bigint: false }).then((promiseStat) => {
    console.log("promise lstat:", promiseStat.isFile(), typeof promiseStat.size, promiseStat.size);
});

fs.rmSync(root, { recursive: true, force: true });
