const root = "/tmp/tsc2c-fs-stat-options";
const filePath = path.join(root, "note.txt");
const BIGINT_FALSE = false;
const THROW_TRUE = true;
const THROW_FALSE = false;

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "stats");

const stat = fs.statSync(filePath, { bigint: BIGINT_FALSE, throwIfNoEntry: THROW_TRUE });
const lstat = fs.lstatSync(filePath, { bigint: BIGINT_FALSE, throwIfNoEntry: THROW_TRUE });
console.log("sync:", stat.isFile(), lstat.isFile(), typeof stat.size, stat.size);

const missingStat = fs.statSync(path.join(root, "missing.txt"), { throwIfNoEntry: THROW_FALSE });
const missingLstat = fs.lstatSync(path.join(root, "missing-link"), { bigint: BIGINT_FALSE, throwIfNoEntry: THROW_FALSE });
console.log("missing sync:", missingStat === undefined, missingLstat === undefined);

fs.promises.stat(filePath, { bigint: BIGINT_FALSE, throwIfNoEntry: THROW_TRUE }).then((promiseStat) => {
    console.log("promise stat:", promiseStat.isFile(), typeof promiseStat.size, promiseStat.size);
});

fs.promises.lstat(filePath, { bigint: BIGINT_FALSE, throwIfNoEntry: THROW_TRUE }).then((promiseStat) => {
    console.log("promise lstat:", promiseStat.isFile(), typeof promiseStat.size, promiseStat.size);
});

fs.promises.stat(path.join(root, "missing-promise.txt"), { throwIfNoEntry: THROW_FALSE }).then((missing) => {
    console.log("promise missing stat:", missing === undefined);
});

fs.promises.lstat(path.join(root, "missing-promise-link"), { bigint: BIGINT_FALSE, throwIfNoEntry: THROW_FALSE }).then((missing) => {
    console.log("promise missing lstat:", missing === undefined);
});

fs.rmSync(root, { recursive: true, force: true });
