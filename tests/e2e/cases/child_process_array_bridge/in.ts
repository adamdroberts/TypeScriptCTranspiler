import {execFileSync, spawnSync} from "node:child_process";
const args: string[] = ["%s"];
args.push("a", "b", "c");
console.log("exec arguments:", execFileSync("/bin/printf", args).toString());
const dynamic: any = args;
console.log("spawn arguments:", spawnSync("/bin/printf", dynamic).stdout.toString());
Reflect.set(dynamic, "1", 17);
console.log("retained owner:", args === dynamic, typeof dynamic[1], dynamic[1]);
