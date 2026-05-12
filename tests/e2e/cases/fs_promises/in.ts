const tmpPath = "/tmp/tsc2c-fs-promises.txt";
const content = "hello from fs.promises\n";
let readBack = "";
let found = "missing";

fs.promises.writeFile(tmpPath, content);
fs.promises.access(tmpPath);

fs.promises.readFile(tmpPath).then((text: string): string => {
    readBack = text;
    return text;
});

fs.promises.readdir("/tmp").then((names: string[]): string => {
    found = names.includes("tsc2c-fs-promises.txt") ? "found" : "missing";
    return found;
});

console.log("read:", readBack.trim());
console.log("found:", found);
