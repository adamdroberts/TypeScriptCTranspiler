import ordinary from "node:child_process";
import * as namespace from "child_process";
import {execFile, execFileSync} from "node:child_process";
const retained = execFileSync;
const options: any = {encoding: "utf8", env: {TSC_CHILD_OWNER: "owner"}};
const args: any = ["-c", 'printf "$TSC_CHILD_OWNER"'];
console.log(namespace.default === ordinary, retained === ordinary.execFileSync);
console.log(Reflect.apply(retained, {}, ["/bin/sh", args, options]));
function callback(label: string) {
    return (error: any, stdout: string) => console.log(label, error === null, stdout);
}
Reflect.apply(execFile, {}, ["/bin/printf", ["callback"], {shell: false}, callback("retained")]);
async function main() {
    console.log(Reflect.apply(retained, {}, ["/bin/printf", [await Promise.resolve("suspended")], {encoding: "utf8"}]));
}
main();
