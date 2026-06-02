import * as nodeOs from "node:os";
import { userInfo } from "os";

let ignoredSeen = "";
function mark(label: string): string {
    ignoredSeen += label;
    return label;
}

const globalInfo: any = os.userInfo();
const namespaceInfo: any = nodeOs.userInfo();
const namedInfo: any = userInfo();
const UTF8 = "utf8";
const UTF8_DASH = "utf-8";
const GLOBAL_OPTIONS = { encoding: UTF8 } as const;
const NAMESPACE_OPTIONS = { encoding: UTF8_DASH } as const;
const NAMED_OPTIONS = { encoding: UTF8 } as const;
const BUFFER_OPTIONS = { encoding: "buffer" } as const;
const globalUtf8: any = os.userInfo(GLOBAL_OPTIONS, mark("g"));
const namespaceUtf8: any = nodeOs.userInfo(NAMESPACE_OPTIONS, mark("n"));
const namedUtf8: any = userInfo(NAMED_OPTIONS, mark("u"));
const bufferInfo: any = nodeOs.userInfo(BUFFER_OPTIONS, mark("b"));

console.log("global:", typeof globalInfo.username, typeof globalInfo.homedir, typeof globalInfo.shell, globalInfo.uid >= 0, globalInfo.gid >= 0);
console.log("namespace:", typeof namespaceInfo.username, namespaceInfo.uid >= 0);
console.log("named:", typeof namedInfo.username, namedInfo.gid >= 0);
console.log("options:", typeof globalUtf8.username, typeof namespaceUtf8.homedir, typeof namedUtf8.shell);
console.log("buffer:", Buffer.isBuffer(bufferInfo.username), Buffer.isBuffer(bufferInfo.homedir), Buffer.isBuffer(bufferInfo.shell), bufferInfo.username.toString().length >= 0);
console.log("ignored:", ignoredSeen);
