import net from "node:net";

const server = net.createServer();

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    const client = net.connect(address.port, "127.0.0.1", () => {
        client.once("close", () => console.log("client close event"));
        client.destroy(() => {
            console.log("client destroy callback:", client.destroyed, client.readyState);
            server.close(() => console.log("server close"));
        });
    });
});
