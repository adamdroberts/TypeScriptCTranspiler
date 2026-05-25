import { hrtime } from "node:process";
import * as proc from "process";

let seen = "";
function mark(label: string): number[] {
    seen += label;
    return [0, 0];
}

const named = hrtime();
const namedDiff = hrtime(mark("n"));
const ns = proc.hrtime();
const nsDiff = proc.hrtime(mark("p"));

console.log("named:", named.length, named[0] >= 0, named[1] >= 0, namedDiff.length);
console.log("namespace:", ns.length, ns[0] >= 0, ns[1] >= 0, nsDiff.length);
console.log("bigint:", typeof hrtime.bigint(), typeof proc.hrtime.bigint());
console.log("ignored:", seen);
