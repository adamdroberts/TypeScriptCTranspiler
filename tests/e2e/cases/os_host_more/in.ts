import * as nodeOs from "node:os";
import { availableParallelism, machine, version } from "os";

console.log("global:", os.availableParallelism() > 0, os.machine().length > 0, os.version().length > 0);
console.log("namespace:", nodeOs.availableParallelism() > 0, nodeOs.machine().length > 0, nodeOs.version().length > 0);
console.log("named:", availableParallelism() > 0, machine().length > 0, version().length > 0);
let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}
console.log("ignored:", os.availableParallelism(mark("a")) > 0, nodeOs.machine(mark("m")).length > 0, version(mark("v")).length > 0, seen);
