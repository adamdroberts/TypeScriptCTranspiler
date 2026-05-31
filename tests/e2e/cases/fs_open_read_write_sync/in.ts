import { openSync, closeSync, readSync, writeSync, existsSync, rmSync } from "node:fs";

const path = "/tmp/tsc2c-fs-open-read-write-sync-test.txt";

if (existsSync(path)) {
    rmSync(path, { force: true });
}

console.log("--- Test 1: Open and write string ---");
const fd1 = openSync(path, "w+");
console.log("Opened fd1:", fd1 > 0 ? "valid" : "invalid");

const strData = "Hello Antigravity Transpiler World!";
const bytesWritten1 = writeSync(fd1, strData);
console.log("Bytes written (string):", bytesWritten1);

console.log("--- Test 2: Read using position ---");
const buffer1 = Buffer.alloc(20);
const bytesRead1 = readSync(fd1, buffer1, 0, 12, 6);
console.log("Bytes read:", bytesRead1);
console.log("Content read:", JSON.stringify(buffer1.subarray(0, bytesRead1).toString("utf8")));

console.log("--- Test 3: Write Buffer ---");
const bufToWrite = Buffer.from(" Excellent");
const bytesWritten2 = writeSync(fd1, bufToWrite, 0, bufToWrite.length);
console.log("Bytes written (Buffer):", bytesWritten2);

let encodingSideEffect = 0;
const bytesWritten3 = writeSync(fd1, "!", null, (encodingSideEffect = 1, "utf8"));
console.log("Encoding side effect:", encodingSideEffect, bytesWritten3);

console.log("--- Test 4: Sequential Read (position = null) ---");
closeSync(fd1);

const fd2 = openSync(path, "r");
const buffer2 = Buffer.alloc(100);
const bytesRead2 = readSync(fd2, buffer2, 0, 100, null);
console.log("Bytes read (seq 1):", bytesRead2);
console.log("Content (seq 1):", buffer2.subarray(0, bytesRead2).toString("utf8"));

const bytesRead3 = readSync(fd2, buffer2, 0, 100, null);
console.log("Bytes read (seq 2, EOF):", bytesRead3);

closeSync(fd2);

console.log("--- Test 5: Error Handling ---");
try {
    openSync("/nonexistent/path/here.txt", "r");
} catch (e) {
    console.log("Caught nonexistent read error");
}

try {
    closeSync(999999);
} catch (e) {
    console.log("Caught invalid fd close error");
}

try {
    openSync(path, "badflag");
} catch (e) {
    console.log("Caught invalid flag error");
}

if (existsSync(path)) {
    rmSync(path, { force: true });
}
