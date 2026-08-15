import net from "node:net";

const server = net.createServer((socket) => {
    console.log("server connection:", server.listening, server.connections);
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
        console.log("server data:", chunk, server.connections);
        socket.end();
    });
    socket.on("close", () => {
        console.log("server socket close:", server.connections);
        server.close(() => console.log("server close:", server.listening, server.connections));
    });
});

server.listen(0, "127.0.0.1", () => {
    console.log("server listening:", server.listening, server.connections);
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const client = net.connect(address.port, "127.0.0.1", () => client.end("ping"));
    client.on("end", () => client.destroy());
});
