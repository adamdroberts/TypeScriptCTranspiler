import net from "node:net";

const server = net.createServer((socket) => {
    console.log("server endpoint:", socket.localFamily, socket.remoteFamily);
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
        console.log("server data:", chunk);
        socket.end("pong");
    });
});

server.listen({ host: "::1", port: 0 }, () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    console.log("server address:", address.address, address.family);

    const client = net.connect({ host: "::1", port: address.port }, () => {
        console.log("client family:", client.localFamily, client.remoteFamily);
        client.setEncoding("utf8");
        client.end("ping");
    });
    client.on("data", (chunk) => console.log("client data:", chunk));
    client.on("end", () => {
        client.destroy();
        server.close(() => console.log("server close"));
    });
});
