import net from "node:net";

try {
    net.connect({ port: 1, timeout: -1 as any });
    console.log("invalid timeout: false");
} catch (error: any) {
    console.log("invalid timeout:", error !== null);
}

const server = net.createServer((socket) => socket.unref());
server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const client = net.connect({ port: address.port, host: "127.0.0.1", timeout: 20 }, () => {
        console.log("connected:", !client.connecting);
    });
    client.on("timeout", () => {
        console.log("timeout:", true);
        client.destroy();
        server.close(() => console.log("server close"));
    });
});
