import http from "node:http";

const server = http.createServer((request, response) => {
    console.log("request:", request.method, request.body);
    response.statusCode = 202;
    response.setHeader("Transfer-Encoding", "chunked");
    response.write("chunk-");
    response.end("response");
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const port = address.port;
    const request = http.request({
        hostname: "127.0.0.1",
        port,
        path: "/chunked",
        method: "POST",
        headers: { "Transfer-Encoding": "chunked" },
    }, (response) => {
        console.log("response:", response.statusCode, response.statusMessage, response.httpVersion, response.body);
        server.close(() => console.log("server close"));
    });
    request.write("chunk-");
    request.end("request");
});
