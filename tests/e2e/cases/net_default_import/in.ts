import net from "node:net";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

console.log("default:", net.isIP("127.0.0.1"), net.isIP("::1"), net.isIP("not an ip"));
console.log("default bool:", net.isIPv4("127.0.0.1"), net.isIPv6("::1"), net.isIPv4("::1"), net.isIPv6("127.0.0.1"));
console.log("default ignored:", net.isIP("127.0.0.1", mark("d")), net.isIPv4("127.0.0.1", mark("v")), net.isIPv6("::1", mark("s")), seen);
