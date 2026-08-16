import http from "node:http";

const server = http.createServer((_request, _response) => {});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    let errorCount = 0;
    let callbackCount = 0;
    const request = http.request({
        hostname: "127.0.0.1",
        port: address.port,
        path: "/destroy-error",
    });
    const error: any = new Error("cancelled");
    request.on("error", (value: any) => {
        errorCount++;
        console.log("error:", value === error, value.name, value.message);
    });

    console.log("chain:", request.destroy(error, () => {
        callbackCount++;
        console.log("callback:", callbackCount);
    }) === request);
    request.destroy(() => {
        callbackCount++;
        console.log("callback:", callbackCount);
        server.close(() => console.log("counts:", errorCount, callbackCount));
    });
});
