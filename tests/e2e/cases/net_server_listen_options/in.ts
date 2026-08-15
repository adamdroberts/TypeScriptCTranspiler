import net from "node:net";

const server = net.createServer((socket) => socket.end("ok"));

server.listen({ port: 0, host: "127.0.0.1" }, () => {
    console.log("server options");
    const address = server.address();
    if (!address) throw new Error("server address missing");

    const client = net.connect(address.port, "127.0.0.1");
    client.setEncoding("utf8");
    client.on("data", (chunk) => console.log("data:", chunk));
    client.on("end", () => {
        client.destroy();
        server.close(() => console.log("server close"));
    });
});
