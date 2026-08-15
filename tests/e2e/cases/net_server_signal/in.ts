import net from "node:net";

declare const AbortController: { new(): any };

const preController: any = new AbortController();
preController.abort("pre-stop");
const preServer: any = net.createServer();
const preEvents: string[] = [];
preServer.on("error", (error: any) => preEvents.push(`error:${error}`));
preServer.on("close", () => {
    preEvents.push("close");
    console.log("pre:", preEvents.join("|"), preServer.listening);

    const postController: any = new AbortController();
    const postServer: any = net.createServer();
    const postEvents: string[] = [];
    postServer.on("error", (error: any) => postEvents.push(`error:${error}`));
    postServer.on("close", () => {
        postEvents.push("close");
        console.log("post:", postEvents.join("|"), postServer.listening);
    });
    postServer.listen({ port: 0, host: "127.0.0.1", signal: postController.signal });
    setTimeout(() => postController.abort("post-stop"), 10);
});
preServer.listen({ port: 0, host: "127.0.0.1", signal: preController.signal });
