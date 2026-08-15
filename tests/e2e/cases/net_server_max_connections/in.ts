import net from "node:net";

let accepted = 0;
const server = net.createServer(() => {
    accepted++;
    console.log("accepted:", accepted, server.connections);
});
server.maxConnections = 1;

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    const first = net.connect(address.port, "127.0.0.1");
    const second = net.connect(address.port, "127.0.0.1", () => {
        second.destroy(() => {
            server.getConnections((error, count) => {
                console.log("limited:", error === null, count, server.connections);
                first.destroy(() => server.close(() => console.log("server close")));
            });
        });
    });
});
