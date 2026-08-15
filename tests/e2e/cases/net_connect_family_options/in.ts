import net from "node:net";

try {
    net.connect({ port: 1, family: 5 as any });
    console.log("invalid family: false");
} catch (error: any) {
    console.log("invalid family:", error !== null);
}

const server = net.createServer((socket) => socket.end("ok"));
server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const client = net.connect({ port: address.port, host: "127.0.0.1", family: 4 }, () => {
        console.log("family:", client.remoteFamily === "IPv4");
    });
    client.setEncoding("utf8");
    client.on("data", (chunk) => console.log("data:", chunk));
    client.on("end", () => {
        client.destroy();
        server.close(() => console.log("server close"));
    });
});
