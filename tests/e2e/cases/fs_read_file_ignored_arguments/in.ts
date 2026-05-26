import { readFileSync } from "node:fs";

const events: string[] = [];
const file = "/tmp/tsc2c-fs-read-file-ignored.txt";

function mark(label: string): string {
    events.push(label);
    return label;
}

function note(label: string): void {
    events.push(label);
}

fs.writeFileSync(file, "read file ignored\n");

const text = fs.readFileSync(file, void note("global-options"), mark("global")).trim();
const buffer = readFileSync(file, { encoding: "buffer" }, mark("named"));

fs.promises.readFile(file, void note("promise-options"), mark("promise")).then((value: string): void => {
    console.log("promise:", value.trim());
});

console.log("sync:", text, Buffer.isBuffer(buffer), buffer.toString().trim());
console.log("events:", events.join("|"));

fs.rmSync(file, { force: true });
