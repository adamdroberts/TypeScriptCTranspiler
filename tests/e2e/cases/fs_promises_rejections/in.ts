const missing = "/tmp/tsc2c-fs-promises-missing-file.txt";
const missingDir = "/tmp/tsc2c-fs-promises-missing-dir";
const badWrite = path.join(missingDir, "out.txt");

let readReason = "";
let statReason = "";
let accessReason = "";
let writeReason = "";
let recovered = "";

fs.promises.readFile(missing)
    .catch((reason: string) => {
        readReason = reason;
        return "read recovered";
    })
    .then((value: string) => {
        recovered = value;
    });

fs.promises.stat(missing).catch((reason: string): any => {
    statReason = reason;
    return "stat recovered";
});

fs.promises.access(missing).catch((reason: string): any => {
    accessReason = reason;
    return "access recovered";
});

fs.promises.writeFile(badWrite, "data").catch((reason: string): any => {
    writeReason = reason;
    return "write recovered";
});

console.log("read:", readReason);
console.log("stat:", statReason);
console.log("access:", accessReason);
console.log("write:", writeReason);
console.log("recovered:", recovered);
