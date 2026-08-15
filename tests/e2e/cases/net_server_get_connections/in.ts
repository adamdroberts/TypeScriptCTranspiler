import net from "node:net";

const server = net.createServer((socket) => {
    server.getConnections((error, count) => {
        console.log("during:", error === null, count);
    });
    socket.on("data", () => socket.end());
    socket.on("close", () => {
        server.getConnections((error, count) => {
            console.log("after:", error === null, count);
            server.close(() => console.log("server close"));
        });
    });
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const client = net.connect(address.port, "127.0.0.1", () => client.end("ping"));
    client.on("end", () => client.destroy());
});
