import fs from "node:fs";

const tmpPath = "/tmp/tsc2c-fs-default-import.txt";
const content = "default fs import\n";
let promised = "";

fs.writeFileSync(tmpPath, content);
console.log("default sync:", fs.existsSync(tmpPath), fs.readFileSync(tmpPath).trim());

fs.promises.readFile(tmpPath).then((text: string): string => {
    promised = text.trim();
    return promised;
});

setImmediate((): void => {
    console.log("default promise:", promised);
    fs.rmSync(tmpPath, { force: true });
});
