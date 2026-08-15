import net from "node:net";

let received = "";
const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    socket.write("one");
    setTimeout(() => socket.write("two"), 20);
    setTimeout(() => socket.end(), 70);
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    const client = net.connect(address.port, "127.0.0.1", () => {
        client.setEncoding("utf8");
        console.log("client controls:", client.pause() === client);
        setTimeout(() => {
            console.log("paused before resume:", received.length === 0);
            console.log("client resume:", client.resume() === client);
        }, 40);
    });
    client.on("data", (chunk) => {
        received += chunk;
    });
    client.on("end", () => {
        console.log("client end:", received);
        client.destroy();
        server.close(() => console.log("server close"));
    });
});
