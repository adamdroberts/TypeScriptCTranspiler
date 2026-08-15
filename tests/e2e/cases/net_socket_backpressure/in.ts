import net from "node:net";

const payload = Buffer.alloc(32768, 65);
const server = net.createServer((socket) => {
    socket.on("drain", () => console.log("server drain:", socket.writableLength, socket.writableNeedDrain));
    const accepted: any = socket.write(payload, () => {
        console.log("server write callback:", socket.writableLength, socket.writableNeedDrain);
        socket.end(() => console.log("server end callback"));
    });
    console.log("server write:", accepted === false, socket.writableLength, socket.writableNeedDrain, socket.writableHighWaterMark);
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    const client = net.connect(address.port, "127.0.0.1", () => {
        client.pause();
        console.log("client state:", client.writableLength, client.writableNeedDrain);
        setTimeout(() => client.resume(), 5);
    });
    client.on("end", () => {
        console.log("client end");
        client.destroy();
        server.close(() => console.log("server close"));
    });
});
