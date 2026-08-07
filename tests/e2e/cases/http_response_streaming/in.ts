import http from "node:http";

const server = http.createServer((_request, response) => {
    response.setHeader("Transfer-Encoding", "chunked");
    response.write("first");
    response.end("second");
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const request = http.get({
        hostname: "127.0.0.1",
        port: address.port,
        path: "/stream",
    }, (response) => {
        console.log("response:", response.statusCode, response.statusMessage, response.httpVersion, response.headers["transfer-encoding"]);
        const chunks: string[] = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.once("end", () => {
            console.log("stream:", chunks.join("|"), response.body);
            server.close(() => console.log("server close"));
        });
    });
    void request;
});
