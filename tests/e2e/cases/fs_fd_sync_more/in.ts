import { openSync, closeSync, writeSync, readSync, existsSync, rmSync } from "node:fs";
import { fsyncSync, fdatasyncSync, ftruncateSync } from "fs";
import { fsyncSync as syncF, fdatasyncSync as dataF, ftruncateSync as truncF } from "node:fs";
import * as fsNs from "fs";
import fsDefault from "node:fs";

const path = "/tmp/tsc2c-fs-fd-sync-more-test.txt";

if (existsSync(path)) {
    rmSync(path, { force: true });
}

console.log("--- Test 1: Write and truncate using default import / alias ---");
const fd = openSync(path, "w+");

// Write 20 bytes
writeSync(fd, "01234567890123456789");

// Truncate to 10 bytes using truncF (alias)
truncF(fd, 10);

// Read and print
const buf = Buffer.alloc(20);
const nRead = readSync(fd, buf, 0, 20, 0);
console.log("Read after truncate 10:", nRead, buf.subarray(0, nRead).toString("utf8"));

// Truncate to default (0 bytes) using fsNs namespace import
fsNs.ftruncateSync(fd);
const nRead2 = readSync(fd, buf, 0, 20, 0);
console.log("Read after truncate default:", nRead2);

console.log("--- Test 2: fsync/fdatasync success using named / default imports ---");
writeSync(fd, "hello");
fsyncSync(fd);
console.log("fsyncSync succeeded");

writeSync(fd, " world");
fsDefault.fdatasyncSync(fd);
console.log("fdatasyncSync succeeded");

console.log("--- Test 3: Invalid fd errors ---");
try {
    syncF(-999);
} catch (e) {
    console.log("Caught invalid fd fsyncSync error");
}

try {
    dataF(-999);
} catch (e) {
    console.log("Caught invalid fd fdatasyncSync error");
}

try {
    ftruncateSync(-999, 10);
} catch (e) {
    console.log("Caught invalid fd ftruncateSync error");
}

console.log("--- Test 4: Ignored arg evaluation ---");
let sideEffect = 0;
// We pass extra ignored arguments and verify side effect evaluates
fsyncSync(fd, (sideEffect = 1));
console.log("fsyncSync ignored arg side effect:", sideEffect);

sideEffect = 0;
fdatasyncSync(fd, (sideEffect = 2));
console.log("fdatasyncSync ignored arg side effect:", sideEffect);

sideEffect = 0;
ftruncateSync(fd, 5, (sideEffect = 3));
console.log("ftruncateSync ignored arg side effect:", sideEffect);

// Close and clean up
closeSync(fd);
if (existsSync(path)) {
    rmSync(path, { force: true });
}
