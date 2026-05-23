import * as nodeOs from "node:os";
import { userInfo } from "os";

const globalInfo: any = os.userInfo();
const namespaceInfo: any = nodeOs.userInfo();
const namedInfo: any = userInfo();
const globalUtf8: any = os.userInfo({ encoding: "utf8" });
const namespaceUtf8: any = nodeOs.userInfo({ encoding: "utf-8" });
const namedUtf8: any = userInfo({ encoding: "utf8" });

console.log("global:", typeof globalInfo.username, typeof globalInfo.homedir, typeof globalInfo.shell, globalInfo.uid >= 0, globalInfo.gid >= 0);
console.log("namespace:", typeof namespaceInfo.username, namespaceInfo.uid >= 0);
console.log("named:", typeof namedInfo.username, namedInfo.gid >= 0);
console.log("options:", typeof globalUtf8.username, typeof namespaceUtf8.homedir, typeof namedUtf8.shell);
