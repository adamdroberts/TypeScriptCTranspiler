const root = "/tmp/tsc2c-fs-stat-options";
const filePath = path.join(root, "note.txt");

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "stats");

const stat = fs.statSync(filePath, { bigint: false, throwIfNoEntry: true });
const lstat = fs.lstatSync(filePath, { bigint: false, throwIfNoEntry: true });
console.log("sync:", stat.isFile(), lstat.isFile(), typeof stat.size, stat.size);

const missingStat = fs.statSync(path.join(root, "missing.txt"), { throwIfNoEntry: false });
const missingLstat = fs.lstatSync(path.join(root, "missing-link"), { bigint: false, throwIfNoEntry: false });
console.log("missing sync:", missingStat === undefined, missingLstat === undefined);

fs.promises.stat(filePath, { bigint: false, throwIfNoEntry: true }).then((promiseStat) => {
    console.log("promise stat:", promiseStat.isFile(), typeof promiseStat.size, promiseStat.size);
});

fs.promises.lstat(filePath, { bigint: false, throwIfNoEntry: true }).then((promiseStat) => {
    console.log("promise lstat:", promiseStat.isFile(), typeof promiseStat.size, promiseStat.size);
});

fs.promises.stat(path.join(root, "missing-promise.txt"), { throwIfNoEntry: false }).then((missing) => {
    console.log("promise missing stat:", missing === undefined);
});

fs.promises.lstat(path.join(root, "missing-promise-link"), { bigint: false, throwIfNoEntry: false }).then((missing) => {
    console.log("promise missing lstat:", missing === undefined);
});

fs.rmSync(root, { recursive: true, force: true });
