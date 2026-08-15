import net from "node:net";

try {
    net.connect({ port: 1, noDelay: 1 as any });
    console.log("invalid noDelay: false");
} catch (error: any) {
    console.log("invalid noDelay:", error !== null);
}

try {
    net.connect({ port: 1, keepAlive: "true" as any });
    console.log("invalid keepAlive: false");
} catch (error: any) {
    console.log("invalid keepAlive:", error !== null);
}

try {
    net.connect({ port: 1, keepAliveInitialDelay: -1 as any });
    console.log("invalid keepAliveInitialDelay: false");
} catch (error: any) {
    console.log("invalid keepAliveInitialDelay:", error !== null);
}

const server = net.createServer((socket) => socket.end("ok"));
server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const client = net.connect({
        port: address.port,
        host: "127.0.0.1",
        noDelay: true,
        keepAlive: true,
        keepAliveInitialDelay: 10,
    }, () => {
        console.log("socket options:", !client.connecting);
    });
    client.setEncoding("utf8");
    client.on("data", (chunk) => console.log("data:", chunk));
    client.on("end", () => {
        client.destroy();
        server.close(() => console.log("server close"));
    });
});
