import http from "node:http";
import net from "node:net";

const server = http.createServer((request, response) => {
    console.log("request:", request.url, request.headers["connection"], request.body);
    response.end(request.url);
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const client = net.connect(address.port, "127.0.0.1", () => {
        client.setEncoding("utf8");
        client.write("GET /one HTTP/1.1\r\nHost: example.test\r\nConnection: keep-alive\r\nContent-Length: 0\r\n\r\n");
        client.end("GET /two HTTP/1.1\r\nHost: example.test\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
    });
    const responseChunks: string[] = [];
    client.on("data", (chunk) => responseChunks.push(chunk));
    client.on("end", () => {
        const responseText = responseChunks.join("");
        const firstStatus = responseText.indexOf("HTTP/1.1 200 OK");
        const secondStatus = responseText.indexOf("HTTP/1.1 200 OK", firstStatus + 1);
        console.log("responses:", firstStatus >= 0, secondStatus > firstStatus, responseText.includes("\r\n\r\n/oneHTTP/1.1"), responseText.endsWith("\r\n\r\n/two"));
        server.close(() => console.log("server close"));
    });
});

void http.createServer();
