import { stderr as stderrAlias, stdout, stdout as stdoutAlias } from "node:process";
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
const alias = stdoutAlias.write("alias:", mark("a"), () => {
    callbacks += 8;
    stdoutAlias.write("alias-cb:");
});
const aliasErr = stderrAlias.write("", "utf8", () => {
    callbacks += 16;
});

console.log("stdio imports", named, namespace, err, alias, aliasErr, callbacks, seen);
