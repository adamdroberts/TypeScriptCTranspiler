import http from "node:http";

const server = http.createServer((request, response) => {
    console.log("request:", request.body, request.trailers["x-request-trailer"]);
    response.statusCode = 203;
    response.setHeader("Transfer-Encoding", "chunked");
    response.setHeader("Trailer", "X-Response-Trailer");
    response.addTrailers({ "X-Response-Trailer": "server" });
    response.end("reply");
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const request = http.request({
        hostname: "127.0.0.1",
        port: address.port,
        path: "/trailers",
        method: "POST",
        headers: {
            "Transfer-Encoding": "chunked",
            Trailer: "X-Request-Trailer",
        },
    }, (response) => {
        response.once("end", () => {
            console.log("response:", response.statusCode, response.body, response.trailers["x-response-trailer"]);
            server.close(() => console.log("server close"));
        });
    });
    request.addTrailers({ "X-Request-Trailer": "client" });
    request.end("request");
});
