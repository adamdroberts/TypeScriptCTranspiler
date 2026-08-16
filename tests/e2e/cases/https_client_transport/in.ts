import { execFileSync } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
import secureHttps, { createServer as createSecureServer } from "node:https";

const prefix = `/tmp/tsc2c-https-${process.pid}`;
const keyPath = `${prefix}.key`;
const certPath = `${prefix}.crt`;
let finished = false;

function cleanup(server: any): void {
    if (finished) return;
    finished = true;
    try { unlinkSync(keyPath); } catch (_error) { /* best effort */ }
    try { unlinkSync(certPath); } catch (_error) { /* best effort */ }
}

try {
    execFileSync("openssl", [
        "req", "-x509", "-newkey", "rsa:2048", "-nodes",
        "-keyout", keyPath, "-out", certPath,
        "-subj", "/CN=localhost", "-days", "1",
    ], { encoding: "buffer" });
} catch (_error) {
    console.log("certificate setup failed");
    process.exit(1);
}

const server: any = createSecureServer({
    key: readFileSync(keyPath, "utf8"),
    cert: readFileSync(certPath, "utf8"),
}, (request: any, response: any) => {
    response.statusCode = 202;
    response.setHeader("Content-Type", "text/plain");
    response.end("secure-ok:" + (request.headers["authorization"] || "missing"));
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");
    const request: any = secureHttps.get({
        hostname: "127.0.0.1",
        port: address.port,
        path: "/secure",
        rejectUnauthorized: false,
        servername: "localhost",
        auth: "tls-user:tls-pass",
    }, (response: any) => {
        response.on("data", (_chunk: any) => { /* response.body is updated by the bounded parser */ });
        response.on("end", () => {
            console.log("status:", response.statusCode);
            console.log("version:", response.httpVersion);
            console.log("body:", response.body);
            server.close(() => cleanup(server));
        });
    });
    request.on("error", (_error: any) => {
        console.log("request error");
        server.close(() => cleanup(server));
        process.exit(1);
    });
});
