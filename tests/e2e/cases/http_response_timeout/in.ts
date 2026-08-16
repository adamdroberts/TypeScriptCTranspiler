import http from "node:http";

let eventCount = 0;
let callbackCount = 0;

const server = http.createServer((_request, response) => {
    response.on("timeout", () => {
        eventCount++;
        console.log("response timeout event");
    });
    console.log("setTimeout:", response.setTimeout(10, () => {
        callbackCount++;
        console.log("response timeout callback");
    }) === response);
    setTimeout(() => response.end("late"), 40);
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    http.get({
        hostname: "127.0.0.1",
        port: address.port,
        path: "/response-timeout",
    }, (response) => {
        response.on("data", () => undefined);
        response.on("end", () => {
            console.log("counts:", eventCount, callbackCount);
            server.close(() => console.log("server close"));
        });
    });
});
