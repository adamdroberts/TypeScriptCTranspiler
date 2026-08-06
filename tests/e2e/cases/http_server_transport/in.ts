import http from "node:http";
import { createServer as makeServer } from "node:http";
import net from "node:net";

const server = makeServer((request, response) => {
    console.log("request:", request.method, request.url, request.httpVersion, request.headers["host"], request.body);
    response.statusCode = 201;
    response.setHeader("Content-Type", "text/plain");
    response.write("hel");
    response.end("lo");
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const client = net.connect(address.port, "127.0.0.1", () => {
        client.setEncoding("utf8");
        client.end("GET /hello HTTP/1.1\r\nHost: example.test\r\nContent-Length: 0\r\n\r\n");
    });
    const responseChunks: string[] = [];
    client.on("data", (chunk) => responseChunks.push(chunk));
    client.on("end", () => {
        const responseText = responseChunks.join("");
        console.log("response:", responseText.includes("HTTP/1.1 201 Created"), responseText.includes("Content-Length: 5"), responseText.includes("\r\n\r\nhello"));
        server.close(() => console.log("server close"));
    });
});

void http.createServer();
