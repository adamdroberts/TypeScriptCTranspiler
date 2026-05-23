import * as nodeOs from "node:os";
import { userInfo } from "os";

const globalInfo: any = os.userInfo(undefined);
const namespaceInfo: any = nodeOs.userInfo({ encoding: undefined });
const namedInfo: any = userInfo({ encoding: undefined });

console.log("global:", typeof globalInfo.username, typeof globalInfo.homedir, globalInfo.uid >= 0);
console.log("namespace:", typeof namespaceInfo.username, typeof namespaceInfo.shell);
console.log("named:", typeof namedInfo.username, namedInfo.gid >= 0);
