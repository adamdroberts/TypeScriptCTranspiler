import net from "node:net";

const server = net.createServer((socket) => socket.end("ok"));

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    const first = net.connect({ port: address.port, host: "127.0.0.1" }, () => {
        console.log("connect options");
    });
    first.setEncoding("utf8");
    first.on("data", (chunk) => console.log("first data:", chunk));
    first.on("end", () => {
        first.destroy();
        const second = net.createConnection({ port: address.port }, () => {
            console.log("createConnection options");
        });
        second.setEncoding("utf8");
        second.on("data", (chunk) => console.log("second data:", chunk));
        second.on("end", () => {
            second.destroy();
            server.close(() => console.log("server close"));
        });
    });
});
