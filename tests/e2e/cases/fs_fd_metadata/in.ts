import { fstatSync, fchmodSync, fchownSync, futimesSync } from "node:fs";
import * as fsNamespace from "fs";
import fsDefault from "node:fs";

const root = "/tmp/tsc2c-fs-fd-metadata";
const filePath = root + "/note.txt";
const uid = process.getuid();
const gid = process.getgid();
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

fsDefault.rmSync(root, { recursive: true, force: true });
fsDefault.mkdirSync(root, { recursive: true });
fsDefault.writeFileSync(filePath, "descriptor");

const fd = fsDefault.openSync(filePath, "r+");
const initial = fstatSync(fd, { bigint: false }, mark("s"));
console.log("stat:", initial.isFile(), initial.size);

fsNamespace.fchmodSync(fd, 0o600, mark("m"));
console.log("chmod:", fsDefault.fstatSync(fd).mode % 512);

fsDefault.fchownSync(fd, uid, gid, mark("o"));
console.log("chown:", fsNamespace.fstatSync(fd).uid === uid, fsNamespace.fstatSync(fd).gid === gid);

futimesSync(fd, 11, new Date(12000), mark("t"));
const updated = fsDefault.fstatSync(fd);
console.log("times:", Math.round(updated.atimeMs), Math.round(updated.mtimeMs));
console.log("ignored:", seen);

try {
    fsNamespace.fstatSync(-999);
} catch (_error) {
    console.log("fstat error");
}

try {
    fchmodSync(-999, 0o600);
} catch (_error) {
    console.log("fchmod error");
}

try {
    fsDefault.fchownSync(-999, uid, gid);
} catch (_error) {
    console.log("fchown error");
}

try {
    futimesSync(-999, 1, 2);
} catch (_error) {
    console.log("futimes error");
}

fsDefault.closeSync(fd);
fsDefault.rmSync(root, { recursive: true, force: true });
