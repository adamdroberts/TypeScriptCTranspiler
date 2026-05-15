import { exec, execFileSync, execSync, spawnSync } from "child_process";

const uid = process.getuid();
const gid = process.getgid();

exec("printf exec-id", { uid: uid, gid: gid }, (error, stdout, stderr) => {
    console.log("exec:", error === null, stdout, stderr.length);
});

console.log("sync:", execSync("printf sync-id", {
    encoding: "utf8",
    uid: uid,
    gid: gid,
}));

console.log("file-sync:", execFileSync("/bin/printf", ["file-id"], {
    encoding: "utf8",
    uid: uid,
    gid: gid,
}));

const spawned: any = spawnSync("/bin/printf", ["spawn-id"], {
    encoding: "utf8",
    uid: uid,
    gid: gid,
});
console.log("spawn:", spawned.status, spawned.stdout);
