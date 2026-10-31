import net from "node:net";
import dns from "node:dns";

// Compiled with compile.allow_net: only 127.0.0.1 (any port) and the name
// "localhost" on port 1 are reachable. Denials fail closed with
// ERR_ACCESS_DENIED before any packet or query leaves the process.
function report(label: string, error: any): void {
    console.log(`${label}:`, error?.code ?? "allowed");
}

try {
    dns.lookup("example.com", (error) => report("dns.lookup example.com", error));
} catch (error: any) {
    report("dns.lookup example.com", error);
}
try {
    dns.resolve4("example.com", (error) => report("dns.resolve4 example.com", error));
} catch (error: any) {
    report("dns.resolve4 example.com", error);
}
try {
    dns.reverse("8.8.8.8", (error) => report("dns.reverse 8.8.8.8", error));
} catch (error: any) {
    report("dns.reverse 8.8.8.8", error);
}
try {
    net.connect(80, "127.1").on("error", (error) => report("connect 127.1", error));
} catch (error: any) {
    report("connect 127.1", error);
}
try {
    net.connect(80, "localhost").on("error", (error) => report("connect localhost:80", error));
} catch (error: any) {
    report("connect localhost:80", error);
}
try {
    net.createServer().listen(0, "0.0.0.0").on("error", (error) => report("listen 0.0.0.0", error));
} catch (error: any) {
    report("listen 0.0.0.0", error);
}

const server = net.createServer((socket) => socket.end("ok"));
server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("server address missing");
    const client = net.connect({ port: address.port, host: "127.0.0.1" });
    client.setEncoding("utf8");
    client.on("data", (chunk) => console.log("loopback data:", chunk));
    client.on("end", () => {
        client.destroy();
        server.close(() => console.log("server close"));
    });
});
