import net from "node:net";
import { createServer as namedCreateServer } from "node:net";

const server = namedCreateServer((socket) => {
    console.log("server controls:", socket.setNoDelay() === socket, socket.setKeepAlive(true, 1000) === socket);
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
        console.log("server data:", chunk, socket.bytesRead === 4, socket.bytesWritten === 0);
        socket.end("pong");
    });
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    console.log("listening:", address.family, address.port > 0);

    const client = net.connect(address.port, "127.0.0.1", () => {
        console.log("client connect:", client.connecting, client.readyState,
            client.setNoDelay(false) === client,
            client.setKeepAlive(true, 1000) === client);
        client.setEncoding("utf8");
        client.end("ping");
    });
    client.on("data", (chunk) => console.log("client data:", chunk, client.bytesRead === 4, client.bytesWritten === 4));
    client.on("end", () => {
        console.log("client end:", client.destroyed, client.bytesRead, client.bytesWritten);
        client.destroy();
        server.close(() => console.log("server close"));
    });
});
