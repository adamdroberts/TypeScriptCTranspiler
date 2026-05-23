import * as nodeNet from "node:net";
import { isIP, isIPv4, isIPv6 } from "net";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

console.log("global:", net.isIP("127.0.0.1"), net.isIP("::1"), net.isIP("not an ip"));
console.log("global bool:", net.isIPv4("127.0.0.1"), net.isIPv6("::1"), net.isIPv4("::1"), net.isIPv6("127.0.0.1"));
console.log("namespace:", nodeNet.isIP("127.0.0.1"), nodeNet.isIPv4("127.0.0.1"), nodeNet.isIPv6("::1"));
console.log("named:", isIP("::1"), isIPv4("not an ip"), isIPv6("::1"));
console.log("ignored:", net.isIP("127.0.0.1", mark("g")), nodeNet.isIPv4("127.0.0.1", mark("n")), isIPv6("::1", mark("m")), seen);
