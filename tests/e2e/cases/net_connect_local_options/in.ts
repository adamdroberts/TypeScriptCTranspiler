import net from "node:net";

try {
    net.connect({ port: 1, localPort: 65536 as any });
    console.log("invalid localPort: false");
} catch (error: any) {
    console.log("invalid localPort:", error !== null);
}

try {
    net.connect({ port: 1, localAddress: 123 as any });
    console.log("invalid localAddress: false");
} catch (error: any) {
    console.log("invalid localAddress:", error !== null);
}

const allocator = net.createServer();
allocator.listen(0, "127.0.0.1", () => {
    const allocated = allocator.address();
    if (!allocated) throw new Error("allocated address missing");
    const localPort = allocated.port;
    setTimeout(() => {
        allocator.close(() => {
            let peerCount = 0;
            const server = net.createServer((socket) => {
                socket.on("data", () => {
                    const remotePort = socket.remotePort;
                    const expectedPort = peerCount++ === 0 ? remotePort === localPort : remotePort !== undefined && remotePort > 0;
                    socket.end(`${socket.remoteAddress === "127.0.0.1"}:${expectedPort}`);
                });
            });
            server.listen({ port: 0, host: "127.0.0.1" }, () => {
                const address = server.address();
                if (!address) throw new Error("server address missing");
                const client = net.connect({
                    port: address.port,
                    host: "127.0.0.1",
                    localAddress: "127.0.0.1",
                    localPort,
                }, () => {
                    console.log("client local address:", client.localAddress === "127.0.0.1");
                    console.log("client local port:", client.localPort === localPort);
                    client.end("ping");
                });
                client.setEncoding("utf8");
                client.on("data", (chunk) => console.log("server peer:", chunk));
                client.on("end", () => {
                    client.destroy();
                    const second = net.connect({
                        port: address.port,
                        host: "127.0.0.1",
                        localPort: 0,
                    }, () => {
                        console.log("wildcard local address:", second.localAddress === "127.0.0.1");
                        console.log("wildcard local port:", second.localPort !== undefined && second.localPort > 0);
                        second.end("ping");
                    });
                    second.setEncoding("utf8");
                    second.on("data", (chunk) => console.log("server peer:", chunk));
                    second.on("end", () => {
                        second.destroy();
                        server.close(() => console.log("server close"));
                    });
                });
            });
        });
    }, 0);
});
