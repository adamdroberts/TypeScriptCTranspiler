import { openSync, closeSync, readvSync, writevSync, existsSync, rmSync } from "node:fs";
import * as fsNamespace from "node:fs";
import fsDefault from "node:fs";

const path = "/tmp/tsc2c-fs-fd-readv-writev-test.txt";

if (existsSync(path)) {
    rmSync(path, { force: true });
}

console.log("--- Test 1: Open and writevSync sequential (position = null/undefined) ---");
const fd = openSync(path, "w+");
console.log("Opened fd:", fd > 0 ? "valid" : "invalid");

const buf1 = Buffer.from("Hello ");
const buf2 = Buffer.from("Vector ");
const buf3 = Buffer.from("World!");
const buffersToWrite = [buf1, buf2, buf3];

// Using named import
const bytesWritten1 = writevSync(fd, buffersToWrite);
console.log("Bytes written (seq 1):", bytesWritten1);

// Sync/flush check by reading sequentially from start
console.log("--- Test 2: readvSync sequential (position = null/undefined) ---");
// Move fd back to beginning by closing and reopening.
closeSync(fd);

const fdRead = openSync(path, "r");
const readBuf1 = Buffer.alloc(6);
const readBuf2 = Buffer.alloc(7);
const readBuf3 = Buffer.alloc(6);
const buffersToRead = [readBuf1, readBuf2, readBuf3];

// Using default import to test it
const bytesRead1 = fsDefault.readvSync(fdRead, buffersToRead);
console.log("Bytes read (seq 1):", bytesRead1);
console.log("Read buf1:", JSON.stringify(readBuf1.toString("utf8")));
console.log("Read buf2:", JSON.stringify(readBuf2.toString("utf8")));
console.log("Read buf3:", JSON.stringify(readBuf3.toString("utf8")));

console.log("--- Test 3: readvSync sequential past EOF ---");
const readBuf4 = Buffer.alloc(10);
const bytesRead2 = readvSync(fdRead, [readBuf4]);
console.log("Bytes read past EOF:", bytesRead2); // should be 0 (EOF)

closeSync(fdRead);

console.log("--- Test 4: writevSync with explicit numeric position ---");
const fdPos = openSync(path, "r+");
const newBuf1 = Buffer.from("COOL");
const newBuf2 = Buffer.from(" ");
const newBuf3 = Buffer.from("WORK");
// Position 6 is right after "Hello " (which is 6 bytes)
// So "Vector World!" (13 bytes) should become "COOL WORKrld!" (13 bytes)
const bytesWritten2 = writevSync(fdPos, [newBuf1, newBuf2, newBuf3], 6);
console.log("Bytes written (pos 6):", bytesWritten2);

console.log("--- Test 5: readvSync with explicit numeric position ---");
const checkBuf1 = Buffer.alloc(13);
// Read 13 bytes starting from position 6
// Using namespace import to test it
const bytesRead3 = fsNamespace.readvSync(fdPos, [checkBuf1], 6);
console.log("Bytes read (pos 6):", bytesRead3);
console.log("Read at pos 6:", JSON.stringify(checkBuf1.subarray(0, bytesRead3).toString("utf8")));

closeSync(fdPos);

console.log("--- Test 6: Empty buffers list ---");
const fdEmpty = openSync(path, "r");
const emptyWrite = writevSync(fdEmpty, []);
console.log("Empty writevSync bytes:", emptyWrite);
const emptyRead = readvSync(fdEmpty, []);
console.log("Empty readvSync bytes:", emptyRead);
closeSync(fdEmpty);

console.log("--- Test 7: Error handling ---");
try {
    readvSync(-1, [Buffer.alloc(10)]);
} catch (e) {
    console.log("Caught readvSync invalid fd error");
}

try {
    writevSync(-1, [Buffer.alloc(10)]);
} catch (e) {
    console.log("Caught writevSync invalid fd error");
}

if (existsSync(path)) {
    rmSync(path, { force: true });
}
