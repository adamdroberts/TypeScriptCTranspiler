import { stdout } from "node:process";
import * as proc from "process";

let callbacks = 0;
let seen = "";

function mark(label: string): string {
    seen += label;
    return "utf8";
}

const named = stdout.write("named:", mark("n"), () => {
    callbacks++;
    stdout.write("cb:");
});
const namespace = proc.stdout.write(Buffer.from("ns:"), () => {
    callbacks += 2;
});
const err = proc.stderr.write("", "utf8", () => {
    callbacks += 4;
});

console.log("stdio imports", named, namespace, err, callbacks, seen);
