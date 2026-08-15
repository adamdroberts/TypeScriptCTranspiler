import { connect, createServer } from "net";

const server = createServer((socket) => {
    socket.setTimeout(10000);
    socket.unref();
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const client = connect(address.port, "127.0.0.1", () => {
        console.log("socket-connected");
        client.unref();
        client.setTimeout(10000);
        server.unref();
        setTimeout(() => {
            console.log("socket-unref-window");
            client.destroy();
            server.close();
        }, 10);
    });
});
