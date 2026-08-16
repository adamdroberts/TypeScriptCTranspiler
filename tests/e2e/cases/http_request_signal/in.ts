import http from "node:http";

declare const AbortController: { new(): any };

const server = http.createServer((_request, _response) => {});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address) throw new Error("server address missing");

    const preController: any = new AbortController();
    preController.abort("pre-stop");
    const preRequest: any = http.request({
        host: "127.0.0.1",
        port: address.port,
        path: "/pre",
        signal: preController.signal,
    });
    const preEvents: string[] = [];
    preRequest.on("error", (error: any) => {
        preEvents.push(`error:${error}`);
        console.log("pre:", preEvents.join("|"));

        const postController: any = new AbortController();
        const postRequest: any = http.request({
            host: "127.0.0.1",
            port: address.port,
            path: "/post",
            signal: postController.signal,
        });
        const postEvents: string[] = [];
        postRequest.on("error", (postError: any) => {
            postEvents.push(`error:${postError}`);
            console.log("post:", postEvents.join("|"));
            server.close(() => console.log("server close"));
        });
        postRequest.end();
        setTimeout(() => postController.abort("post-stop"), 10);
    });
    preRequest.end();
});
