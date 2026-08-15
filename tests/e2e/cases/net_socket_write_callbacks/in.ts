import net from "node:net";

const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    socket.on("finish", () => console.log("server finish event"));
    socket.on("data", (chunk) => {
        console.log("server data:", chunk);
        socket.write("pong", () => console.log("server write callback"));
        socket.end(() => console.log("server end callback"));
    });
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    const client = net.connect(address.port, "127.0.0.1", () => {
        client.on("finish", () => console.log("client finish event"));
        client.write("ping", () => console.log("client write callback"));
        client.end(() => console.log("client end callback"));
    });
    client.on("data", (chunk) => console.log("client data:", chunk));
    client.on("end", () => {
        console.log("client end");
        client.destroy();
        server.close(() => console.log("server close"));
    });
});
