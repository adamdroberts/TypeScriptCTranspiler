const events: string[] = [];
const file = "/tmp/tsc2c-fs-promises-stat-access-ignored.txt";

function mark(label: string): number {
    events.push(label);
    return 0;
}

fs.rmSync(file, { force: true });
fs.writeFileSync(file, "stats");

fs.promises.access(file, undefined, mark("access-default"));
fs.promises.access(file, fs.constants.F_OK, mark("access-mode"));

fs.promises.stat(file, undefined, mark("stat")).then((value: FSStats): void => {
    console.log("stat:", value.isFile(), value.size);
});

fs.promises.lstat(file, undefined, mark("lstat")).then((value: FSStats): void => {
    console.log("lstat:", value.isFile(), value.size);
});

fs.promises.stat(file + ".missing", { throwIfNoEntry: false }, mark("missing")).then((value: FSStats | undefined): void => {
    console.log("missing:", value === undefined);
});

fs.rmSync(file, { force: true });

console.log("events:", events.join("|"));
