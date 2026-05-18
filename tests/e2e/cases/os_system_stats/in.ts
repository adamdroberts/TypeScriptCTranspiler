import * as nodeOs from "node:os";
import { freemem, loadavg, totalmem, uptime } from "os";

const globalLoad = os.loadavg();
const namespaceLoad = nodeOs.loadavg();
const namedLoad = loadavg();
let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}
const ignoredLoad = loadavg(mark("l"));

console.log("global mem:", os.totalmem() >= 0, os.freemem() >= 0, os.uptime() >= 0);
console.log("global load:", globalLoad.length, globalLoad[0] >= 0, globalLoad[1] >= 0, globalLoad[2] >= 0);
console.log("namespace:", nodeOs.totalmem() >= 0, nodeOs.freemem() >= 0, nodeOs.uptime() >= 0, namespaceLoad.length);
console.log("named:", totalmem() >= 0, freemem() >= 0, uptime() >= 0, namedLoad.length);
console.log("ignored:", os.totalmem(mark("t")) >= 0, nodeOs.freemem(mark("f")) >= 0, uptime(mark("u")) >= 0, ignoredLoad.length, seen);
