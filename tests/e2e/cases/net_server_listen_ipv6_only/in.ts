import net from "node:net";

const invalid = net.createServer();
try {
    invalid.listen({ port: 0, host: "::1", ipv6Only: 1 as any });
    console.log("invalid ipv6Only: false");
} catch (error: any) {
    console.log("invalid ipv6Only:", error !== null);
}

const server = net.createServer((socket) => socket.end("ok"));
server.listen({ port: 0, host: "::", ipv6Only: true }, () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    console.log("server ipv6Only:", address.family === "ipv6");

    const client = net.connect({ port: address.port, host: "::1" });
    client.setEncoding("utf8");
    client.on("data", (chunk) => console.log("data:", chunk));
    client.on("end", () => {
        client.destroy();
        server.close(() => console.log("server close"));
    });
});
