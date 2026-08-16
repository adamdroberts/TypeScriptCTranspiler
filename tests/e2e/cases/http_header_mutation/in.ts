import http from "node:http";

const server = http.createServer((request, response) => {
    console.log("request:", request.headers["x-client"], request.headers["x-removed"]);
    response.setHeader("X-Server", "first");
    response.setHeader("x-server", "second");
    console.log("response header:", response.getHeader("X-SERVER"), response.hasHeader("x-server"), response.headersSent);
    response.removeHeader("x-server");
    console.log("response removed:", response.hasHeader("X-Server"), response.getHeader("x-server"));
    response.setHeader("X-Server", "final");
    console.log("response before end:", response.headersSent, response.getHeader("x-server"));
    response.end("ok");
    console.log("response after end:", response.headersSent);
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const request = http.request({
        hostname: "127.0.0.1",
        port: address.port,
        path: "/headers",
    }, (response) => {
        console.log("client response:", response.headers["x-server"], response.body);
        server.close(() => console.log("server close"));
    });
    request.setHeader("X-Client", "first");
    request.setHeader("x-client", "second");
    request.setHeader("X-Removed", "remove");
    console.log("request header:", request.getHeader("X-CLIENT"), request.hasHeader("x-client"), request.headersSent);
    request.removeHeader("x-removed");
    console.log("request removed:", request.hasHeader("X-Removed"), request.getHeader("x-removed"), request.headersSent);
    request.setHeader("X-Client", "final");
    console.log("request final:", request.getHeader("x-client"));
    request.end();
});
