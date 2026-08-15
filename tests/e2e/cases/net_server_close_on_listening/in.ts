import net from "node:net";

const server = net.createServer();
server.listen(0, "127.0.0.1", () => {
    console.log("listening callback:", server.listening);
    server.close(() => console.log("close callback:", server.listening));
});
