import { execFileSync, spawn } from "node:child_process";
import { unlinkSync } from "node:fs";
import secureHttps from "node:https";

const prefix = `/tmp/tsc2c-https-${process.pid}`;
const keyPath = `${prefix}.key`;
const certPath = `${prefix}.crt`;
const port = 42000 + (process.pid % 1000);
let finished = false;

function cleanup(server: any): void {
    if (finished) return;
    finished = true;
    server.kill();
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

const server: any = spawn("openssl", [
    "s_server", "-accept", String(port), "-cert", certPath, "-key", keyPath, "-www", "-quiet",
], { stdio: "ignore" });

setTimeout(() => {
    const request: any = secureHttps.get({
        hostname: "127.0.0.1",
        port,
        path: "/",
        rejectUnauthorized: false,
        servername: "localhost",
    }, (response: any) => {
        response.on("data", (_chunk: any) => { /* response.body is updated by the bounded parser */ });
        response.on("end", () => {
            console.log("status:", response.statusCode);
            console.log("version:", response.httpVersion);
            console.log("body:", response.body.length > 0);
            cleanup(server);
        });
    });
    request.on("error", (_error: any) => {
        console.log("request error");
        cleanup(server);
        process.exit(1);
    });
}, 200);
