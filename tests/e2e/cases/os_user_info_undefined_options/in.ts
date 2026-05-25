import * as nodeOs from "node:os";
import { userInfo } from "os";

const NAMESPACE_OPTIONS = { encoding: void 0 } as const;
const NAMED_OPTIONS = { encoding: undefined } as const;

const globalInfo: any = os.userInfo(void 0);
const namespaceInfo: any = nodeOs.userInfo(NAMESPACE_OPTIONS);
const namedInfo: any = userInfo(NAMED_OPTIONS);

console.log("global:", typeof globalInfo.username, typeof globalInfo.homedir, globalInfo.uid >= 0);
console.log("namespace:", typeof namespaceInfo.username, typeof namespaceInfo.shell);
console.log("named:", typeof namedInfo.username, namedInfo.gid >= 0);
