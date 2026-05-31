import dnsDefault, { getDefaultResultOrder, setDefaultResultOrder } from "dns";
import * as nodeDns from "node:dns";
import dnsPromisesDefault, {
    getDefaultResultOrder as getPromiseDefaultResultOrder,
    setDefaultResultOrder as setPromiseDefaultResultOrder,
} from "node:dns/promises";

let seen = "";
function mark(label: string): string {
    seen += label + "|";
    return label;
}

console.log("initial:", getDefaultResultOrder(mark("g0")));

setDefaultResultOrder("ipv4first", mark("s4"));
console.log("named:", getDefaultResultOrder(), nodeDns.getDefaultResultOrder(mark("ng")));

dnsDefault.setDefaultResultOrder("ipv6first", mark("d6"));
console.log("default:", dnsDefault.getDefaultResultOrder(), getPromiseDefaultResultOrder(mark("pg")));

setPromiseDefaultResultOrder("verbatim", mark("psv"));
console.log("promises named:", nodeDns.getDefaultResultOrder(), getPromiseDefaultResultOrder());

dnsPromisesDefault.setDefaultResultOrder("ipv4first", mark("pd4"));
console.log("promises default:", dnsPromisesDefault.getDefaultResultOrder(mark("pdg")));

try {
    nodeDns.setDefaultResultOrder("bad" as any, mark("bad"));
} catch (e) {
    console.log("invalid:", String(e));
}

console.log("final:", getDefaultResultOrder(), seen);
