declare const AbortController: { new(): any };

import { spawn } from "child_process";

const preController: any = new AbortController();
preController.abort("pre-stop");
const preChild: any = spawn("/bin/sleep", ["1"], { signal: preController.signal });
const preEvents: string[] = [];
preChild.on("spawn", () => preEvents.push("spawn"));
preChild.on("error", (error: any) => preEvents.push(`error:${error}`));
preChild.on("exit", (code: any, signal: any) => preEvents.push(`exit:${code}:${signal}`));
preChild.on("close", (code: any, signal: any) => {
    preEvents.push(`close:${code}:${signal}`);
    console.log("pre:", preEvents.join("|"), preChild.killed);

    const postController: any = new AbortController();
    const postChild: any = spawn("/bin/sleep", ["1"], { signal: postController.signal });
    const postEvents: string[] = [];
    postChild.on("spawn", () => postEvents.push("spawn"));
    postChild.on("error", (error: any) => postEvents.push(`error:${error}`));
    postChild.on("exit", (postCode: any, postSignal: any) => postEvents.push(`exit:${postCode}:${postSignal}`));
    postChild.on("close", (postCode: any, postSignal: any) => {
        postEvents.push(`close:${postCode}:${postSignal}`);
        console.log("post:", postEvents.join("|"), postChild.killed);
    });
    setTimeout(() => postController.abort("post-stop"), 10);
});
