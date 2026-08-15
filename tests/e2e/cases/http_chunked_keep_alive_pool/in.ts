import http from "node:http";

let connectionCount = 0;
let requestCount = 0;

const server = http.createServer((request, response) => {
    const index = requestCount++;
    console.log("request:", index, request.url, request.body);
    response.setHeader("Transfer-Encoding", "chunked");
    response.end(index === 0 ? "one" : "two");
});

server.on("connection", () => connectionCount++);
server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const port = address.port;

    const startSecond = () => {
        const second = http.request({
            hostname: "127.0.0.1",
            port,
            path: "/two",
            method: "POST",
            headers: {
                "Transfer-Encoding": "chunked",
                Connection: "close",
            },
        }, (response) => {
            response.on("end", () => {
                console.log("response:", response.body);
                console.log("connections:", connectionCount);
                server.close(() => console.log("server close"));
            });
        });
        second.end("b");
    };

    const first = http.request({
        hostname: "127.0.0.1",
        port,
        path: "/one",
        method: "POST",
        headers: { "Transfer-Encoding": "chunked" },
    }, (response) => {
        response.on("end", () => {
            console.log("response:", response.body);
            setTimeout(() => startSecond(), 10);
        });
    });
    first.end("a");
});
