import defaultFs, { statfsSync } from "fs";
import * as nodefs from "node:fs";

const testPath = "/tmp";
const events: string[] = [];

function mark(label: string): any {
    events.push(label);
    return undefined;
}

// 1. Test basic call using global fs
const stats1 = fs.statfsSync(testPath);
console.log("global:", typeof stats1.bsize === "number", stats1.bsize > 0);
console.log("fields:",
    typeof stats1.frsize === "number" && stats1.frsize > 0,
    typeof stats1.blocks === "number" && stats1.blocks >= 0,
    typeof stats1.bfree === "number" && stats1.bfree >= 0,
    typeof stats1.bavail === "number" && stats1.bavail >= 0,
    typeof stats1.files === "number" && stats1.files >= 0,
    typeof stats1.ffree === "number" && stats1.ffree >= 0
);

// 2. Test call using named import from fs
const stats2 = statfsSync(testPath, { bigint: false });
console.log("named:", typeof stats2.bsize === "number", stats2.bsize > 0);

// 3. Test call using default import from fs
const stats3 = defaultFs.statfsSync(testPath, undefined, mark("ignored-extra"));
console.log("default:", typeof stats3.bsize === "number", stats3.bsize > 0);

// 4. Test call using namespace import from node:fs and void side effect
const stats4 = nodefs.statfsSync(testPath, void mark("void-side-effect"));
console.log("namespace:", typeof stats4.bsize === "number", stats4.bsize > 0);

// 5. Test error throw for a missing path
let missingError: any = null;
try {
    fs.statfsSync("/nonexistent/path/that/does/not/exist");
} catch (err: any) {
    missingError = err;
}
console.log("missing error thrown:", !!missingError);

console.log("events:", events.join("|"));
