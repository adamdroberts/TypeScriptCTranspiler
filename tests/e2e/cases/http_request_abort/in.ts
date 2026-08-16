import http from "node:http";

const server = http.createServer((_request, _response) => {});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    const request = http.request({
        hostname: "127.0.0.1",
        port: address.port,
        path: "/abort",
    });
    request.on("abort", () => {
        console.log("abort event");
        console.log("aborted:", request.aborted);
        request.abort();
        server.close(() => console.log("server close"));
    });
    console.log("chain:", request.abort() === request);
});
