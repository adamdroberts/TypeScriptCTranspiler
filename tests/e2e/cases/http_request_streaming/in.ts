import http from "node:http";
import net from "node:net";

const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    const requestChunks: string[] = [];
    socket.on("data", (chunk) => {
        requestChunks.push(chunk);
        const requestText = requestChunks.join("");
        if (!requestText.includes("0\r\n\r\n")) return;
        console.log(
            "chunks:",
            requestText.includes("5\r\nfirst\r\n"),
            requestText.includes("6\r\nsecond\r\n"),
            requestText.indexOf("5\r\nfirst\r\n") < requestText.indexOf("6\r\nsecond\r\n"),
        );
        socket.end("HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
    });
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const request = http.request({
        hostname: "127.0.0.1",
        port: address.port,
        path: "/request-stream",
        method: "POST",
        headers: { "Transfer-Encoding": "chunked" },
    }, () => {
        server.close(() => console.log("server close"));
    });
    request.write("first");
    request.write("second");
    request.end();
});
