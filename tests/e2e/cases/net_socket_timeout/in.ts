import net from "node:net";

const server = net.createServer((socket) => {
    setTimeout(() => socket.write("ping"), 20);
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    const client = net.connect(address.port, "127.0.0.1", () => {
        client.on("timeout", () => console.log("client timeout event:", client.destroyed));
        console.log("client connect:", client.setTimeout(80, () => {
            console.log("client timeout callback:", client.destroyed, client.setTimeout(0) === client);
            client.destroy();
            server.close(() => console.log("server close"));
       }) === client);
        setTimeout(() => console.log("client after activity:", client.destroyed), 90);
    });
    client.on("data", (chunk) => console.log("client data:", chunk));
    client.on("close", () => console.log("client close:", client.destroyed));
});
