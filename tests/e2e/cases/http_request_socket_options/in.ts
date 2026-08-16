import http from "node:http";

const server = http.createServer((_request, response) => {
    response.end("ok");
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    const request = http.request({
        hostname: "127.0.0.1",
        port: address.port,
        path: "/socket-options",
    }, (response) => {
        response.on("data", () => undefined);
        response.on("end", () => {
            console.log("response:", response.body);
            server.close(() => console.log("server close"));
        });
    });
    console.log("noDelay:", request.setNoDelay(false) === request);
    console.log("keepAlive:", request.setSocketKeepAlive(true, 1000) === request);
    try {
        request.setSocketKeepAlive(true, -1);
        console.log("invalid delay: false");
    } catch (_error) {
        console.log("invalid delay: true");
    }
    request.end();
});
