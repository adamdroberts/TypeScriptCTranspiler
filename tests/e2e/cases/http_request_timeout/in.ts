import http from "node:http";

const server = http.createServer((_request, response) => {
    setTimeout(() => {
        response.setHeader("Content-Length", "4");
        response.end("late");
    }, 40);
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    let eventCount = 0;
    let callbackCount = 0;
    const request = http.request({
        hostname: "127.0.0.1",
        port: address.port,
        path: "/timeout",
    }, (response) => {
        response.on("data", () => undefined);
        response.on("end", () => {
            console.log("counts:", eventCount, callbackCount);
            server.close(() => console.log("server close"));
        });
    });
    request.on("timeout", () => {
        eventCount++;
        console.log("timeout event");
    });
    console.log("setTimeout:", request.setTimeout(10, () => {
        callbackCount++;
        console.log("timeout callback");
    }) === request);
    request.end();
});
