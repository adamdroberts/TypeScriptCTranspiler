import * as nodeOs from "node:os";
import { userInfo } from "os";

const globalInfo: any = os.userInfo();
const namespaceInfo: any = nodeOs.userInfo();
const namedInfo: any = userInfo();

console.log("global:", typeof globalInfo.username, typeof globalInfo.homedir, typeof globalInfo.shell, globalInfo.uid >= 0, globalInfo.gid >= 0);
console.log("namespace:", typeof namespaceInfo.username, namespaceInfo.uid >= 0);
console.log("named:", typeof namedInfo.username, namedInfo.gid >= 0);
