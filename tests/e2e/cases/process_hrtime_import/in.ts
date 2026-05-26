import { hrtime, hrtime as hrtimeAlias } from "node:process";
import * as proc from "process";

let seen = "";
function mark(label: string): number[] {
    seen += label;
    return [0, 0];
}

const named = hrtime();
const namedDiff = hrtime(mark("n"));
const alias = hrtimeAlias();
const aliasDiff = hrtimeAlias(mark("a"));
const ns = proc.hrtime();
const nsDiff = proc.hrtime(mark("p"));

console.log("named:", named.length, named[0] >= 0, named[1] >= 0, namedDiff.length);
console.log("alias:", alias.length, alias[0] >= 0, alias[1] >= 0, aliasDiff.length);
console.log("namespace:", ns.length, ns[0] >= 0, ns[1] >= 0, nsDiff.length);
console.log("bigint:", typeof hrtime.bigint(), typeof hrtimeAlias.bigint(), typeof proc.hrtime.bigint());
console.log("ignored:", seen);
