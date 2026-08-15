import net from "node:net";

const server = net.createServer((socket) => {
    console.log("server open:", socket.readable, socket.writable,
        socket.readableEnded, socket.writableEnded, socket.remoteFamily);
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
        console.log("server data:", chunk, socket.readableEnded, socket.writableEnded);
        socket.end("pong");
    });
    socket.on("end", () => {
        console.log("server end:", socket.readable, socket.writable,
            socket.readableEnded, socket.writableEnded);
    });
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    const client = net.connect(address.port, "127.0.0.1", () => {
        console.log("client endpoint:", client.localFamily, client.remoteFamily);
        client.setEncoding("utf8");
        client.end("ping");
        console.log("client wrote:", client.writable, client.writableEnded);
    });
    client.on("data", (chunk) => console.log("client data:", chunk));
    client.on("end", () => {
        console.log("client end:", client.readable, client.writable,
            client.readableEnded, client.writableEnded);
        client.destroy();
        server.close(() => console.log("server close"));
    });
});
