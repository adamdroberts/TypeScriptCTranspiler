import http from "node:http";

const server = http.createServer((request, response) => {
    if (request.method === "POST") {
        response.statusCode = 202;
        response.setHeader("Content-Type", "text/plain");
        response.end("pong:" + request.body);
        return;
    }
    response.statusCode = 200;
    response.setHeader("Content-Type", "text/plain");
    response.end("get-ok");
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const port = address.port;
    const post = http.request({
        hostname: "127.0.0.1",
        port,
        path: "/client",
        method: "POST",
        headers: { "X-Test": "yes" },
    }, (response) => {
        console.log("request:", response.statusCode, response.statusMessage, response.httpVersion, response.headers["content-type"], response.body);
        const get = http.get({
            host: "127.0.0.1",
            port,
            path: "/get",
        }, (getResponse) => {
            console.log("get:", getResponse.statusCode, getResponse.statusMessage, getResponse.httpVersion, getResponse.headers["content-type"], getResponse.body);
            server.close(() => console.log("server close"));
        });
        void get;
    });
    post.write("pong:");
    post.end("body");
});
