import { readFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-read-file-plus-flags.txt";

fs.rmSync(path, { force: true });
fs.writeFileSync(path, "plus flags");

console.log("sync r+:", fs.readFileSync(path, { flag: "r+" }));
console.log("named rs+:", readFileSync(path, { encoding: "utf8", flag: "rs+" }));

fs.promises.readFile(path, { flag: "r+" }).then((text: string): string => {
    console.log("promise r+:", text);
    fs.promises.readFile(path, { encoding: "buffer", flag: "rs+" }).then((data: Buffer): void => {
        console.log("promise rs+ buffer:", data.toString());
        fs.rmSync(path, { force: true });
    });
    return text;
});
