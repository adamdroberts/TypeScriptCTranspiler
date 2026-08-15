import net from "node:net";

declare const AbortController: { new(): any };

const server = net.createServer((socket) => {
    socket.on("error", () => {});
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    const preController: any = new AbortController();
    preController.abort("pre-stop");
    const preClient: any = net.connect({
        port: address.port,
        host: "127.0.0.1",
        signal: preController.signal,
    });
    const preEvents: string[] = [];
    preClient.on("error", (error: any) => preEvents.push(`error:${error}`));
    preClient.on("close", () => {
        preEvents.push("close");
        console.log("pre:", preEvents.join("|"), preClient.destroyed);

        const postController: any = new AbortController();
        const postClient: any = net.connect({
            port: address.port,
            host: "127.0.0.1",
            signal: postController.signal,
        });
        const postEvents: string[] = [];
        postClient.on("error", (error: any) => postEvents.push(`error:${error}`));
        postClient.on("close", () => {
            postEvents.push("close");
            console.log("post:", postEvents.join("|"), postClient.destroyed);
            server.close(() => console.log("server close", server.listening));
        });
        setTimeout(() => postController.abort("post-stop"), 10);
    });
});
