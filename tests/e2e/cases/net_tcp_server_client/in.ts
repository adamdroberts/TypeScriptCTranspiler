import net from "node:net";
import { createServer as namedCreateServer } from "node:net";

const server = namedCreateServer((socket) => {
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
        console.log("server data:", chunk);
        socket.end("pong");
    });
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    console.log("listening:", address.family, address.port > 0);

    const client = net.connect(address.port, "127.0.0.1", () => {
        console.log("client connect:", client.connecting, client.readyState);
        client.setEncoding("utf8");
        client.end("ping");
    });
    client.on("data", (chunk) => console.log("client data:", chunk));
    client.on("end", () => {
        console.log("client end:", client.destroyed);
        client.destroy();
        server.close(() => console.log("server close"));
    });
});
