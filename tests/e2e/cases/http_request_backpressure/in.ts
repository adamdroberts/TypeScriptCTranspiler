import http from "node:http";

const payload = Buffer.alloc(32768, 66);
const server = http.createServer((request, response) => {
    console.log("server body:", request.body.length);
    response.end("ok");
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    const request = http.request({
        host: "127.0.0.1",
        port: address.port,
        method: "POST",
        headers: { "Transfer-Encoding": "chunked" }
    }, (response) => {
        response.on("data", () => undefined);
        response.on("end", () => {
            console.log("response end:", response.body);
            server.close(() => console.log("server close"));
        });
    });
    request.on("drain", () => console.log("request drain:", request.writableLength, request.writableNeedDrain));
    const accepted: any = request.write(payload);
    console.log("request write:", accepted === false, request.writableLength >= payload.length, request.writableNeedDrain, request.writableHighWaterMark);
    request.end();
});
