import http from "node:http";

const server = http.createServer((request, response) => {
    response.end(request.headers["authorization"] || "missing");
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const port = address.port;

    const request = http.request({
        host: "127.0.0.1",
        port,
        path: "/request",
        auth: "alice:secret",
    }, (response) => {
        response.on("end", () => {
            console.log("request:", response.body);
            const get = http.get({
                host: "127.0.0.1",
                port,
                path: "/get",
                auth: "ignored:user",
                headers: { Authorization: "Bearer explicit" },
            }, (getResponse) => {
                getResponse.on("end", () => {
                    console.log("get:", getResponse.body);
                    server.close(() => console.log("server close"));
                });
            });
            void get;
        });
    });
    request.end();
});
