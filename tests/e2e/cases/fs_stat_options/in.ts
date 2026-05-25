const root = "/tmp/tsc2c-fs-stat-options";
const filePath = path.join(root, "note.txt");
const BIGINT_FALSE = false;
const THROW_TRUE = true;
const THROW_FALSE = false;
const STAT_OPTIONS = { bigint: BIGINT_FALSE, throwIfNoEntry: THROW_TRUE } as const;
const MISSING_OPTIONS = { throwIfNoEntry: THROW_FALSE } as const;
const MISSING_LSTAT_OPTIONS = { bigint: BIGINT_FALSE, throwIfNoEntry: THROW_FALSE } as const;

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "stats");

const stat = fs.statSync(filePath, STAT_OPTIONS);
const lstat = fs.lstatSync(filePath, STAT_OPTIONS);
console.log("sync:", stat.isFile(), lstat.isFile(), typeof stat.size, stat.size);

const missingStat = fs.statSync(path.join(root, "missing.txt"), MISSING_OPTIONS);
const missingLstat = fs.lstatSync(path.join(root, "missing-link"), MISSING_LSTAT_OPTIONS);
console.log("missing sync:", missingStat === undefined, missingLstat === undefined);

fs.promises.stat(filePath, STAT_OPTIONS).then((promiseStat) => {
    console.log("promise stat:", promiseStat.isFile(), typeof promiseStat.size, promiseStat.size);
});

fs.promises.lstat(filePath, STAT_OPTIONS).then((promiseStat) => {
    console.log("promise lstat:", promiseStat.isFile(), typeof promiseStat.size, promiseStat.size);
});

fs.promises.stat(path.join(root, "missing-promise.txt"), MISSING_OPTIONS).then((missing) => {
    console.log("promise missing stat:", missing === undefined);
});

fs.promises.lstat(path.join(root, "missing-promise-link"), MISSING_LSTAT_OPTIONS).then((missing) => {
    console.log("promise missing lstat:", missing === undefined);
});

fs.rmSync(root, { recursive: true, force: true });
