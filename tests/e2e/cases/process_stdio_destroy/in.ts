import { stdin, stdout, stderr } from "process";
import { isDestroyed } from "stream";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

stdin.destroy();
stdout.destroy(mark("out"));
stderr.destroy(undefined, mark("err"));

console.log("state:", stdin.destroyed, stdout.destroyed, stderr.destroyed);
console.log("predicate:", isDestroyed(stdin), isDestroyed(stdout), isDestroyed(stderr));
console.log("side effects:", seen);
