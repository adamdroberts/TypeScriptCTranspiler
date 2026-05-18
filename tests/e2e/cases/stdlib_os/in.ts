// Deterministic bits only (platform, arch are environment-specific).
console.log("cpus >=1:", os.cpus().length >= 1);
console.log("platform nonempty:", os.platform().length > 0);
console.log("arch nonempty:", os.arch().length > 0);
console.log("hostname nonempty:", os.hostname().length > 0);
console.log("tmpdir:", os.tmpdir());
let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}
console.log("ignored basics:", os.platform(mark("p")).length > 0, os.arch(mark("a")).length > 0, os.hostname(mark("h")).length > 0, os.tmpdir(mark("d")).length > 0, os.homedir(mark("o")).length > 0, os.cpus(mark("c")).length >= 1, seen);

const t0 = Date.now();
const t1 = Date.now();
console.log("time monotonic-ish:", t1 >= t0);

console.log("isInteger 5:", Number.isInteger(5));
console.log("isInteger 5.5:", Number.isInteger(5.5));
console.log("isNaN NaN:", Number.isNaN(NaN));
console.log("isFinite 1/0:", Number.isFinite(1 / 0));

console.log("parseInt '42':", parseInt("42"));
console.log("parseFloat '3.14':", parseFloat("3.14"));
