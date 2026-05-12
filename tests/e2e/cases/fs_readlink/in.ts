import * as nodefs from "node:fs";

const syncTarget = fs.readlinkSync("/proc/self/exe");
let promiseTarget = "";

nodefs.promises.readlink("/proc/self/exe").then((target: string): string => {
    promiseTarget = target;
    return target;
});

console.log("sync:", syncTarget.length > 0, syncTarget.indexOf("/") === 0);
console.log("promise:", promiseTarget.length > 0, promiseTarget.indexOf("/") === 0);
