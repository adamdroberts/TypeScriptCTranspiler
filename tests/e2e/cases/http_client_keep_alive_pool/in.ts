import http from "node:http";

let connections = 0;
let firstBody = "";
let secondBody = "";
let port = 0;

const server = http.createServer((_request, response) => {
    response.setHeader("Content-Type", "text/plain");
    response.end("ok");
});

server.on("connection", () => connections++);
server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    port = address.port;

    const firstRequest = http.get({ hostname: "127.0.0.1", port, path: "/one" }, (first) => {
        first.on("end", () => {
            firstBody = first.body;
            setTimeout(() => {
                const secondRequest = http.get({
                    hostname: "127.0.0.1",
                    port,
                    path: "/two",
                    headers: { Connection: "close" },
                }, (second) => {
                    second.on("end", () => {
                        secondBody = second.body;
                        console.log("connections:", connections);
                        console.log("bodies:", firstBody, secondBody);
                        server.close(() => console.log("server close"));
                    });
                });
                void secondRequest;
            }, 10);
        });
    });
    void firstRequest;
});
