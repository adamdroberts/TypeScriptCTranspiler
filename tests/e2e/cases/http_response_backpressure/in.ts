import http from "node:http";
import net from "node:net";

const payload = Buffer.alloc(32768, 65);
const server = http.createServer((_request, response) => {
    response.setHeader("Transfer-Encoding", "chunked");
    response.on("drain", () => console.log("response drain:", response.writableLength, response.writableNeedDrain));
    const accepted: any = response.write(payload);
    console.log("response write:", accepted === false, response.writableLength >= payload.length, response.writableNeedDrain, response.writableHighWaterMark);
    response.end();
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    const client = net.connect(address.port, "127.0.0.1", () => {
        client.write("GET / HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n");
    });
    const chunks: Buffer[] = [];
    client.on("data", (chunk) => chunks.push(chunk));
    client.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        const body_start = raw.indexOf("\r\n\r\n");
        const wire_body = raw.slice(body_start + 4);
        console.log("client response:", raw.startsWith("HTTP/1.1 200"), wire_body.startsWith("8000\r\n"), wire_body.endsWith("\r\n0\r\n\r\n"), wire_body.length === payload.length + 13);
        client.destroy();
        server.close(() => console.log("server close"));
    });
});
