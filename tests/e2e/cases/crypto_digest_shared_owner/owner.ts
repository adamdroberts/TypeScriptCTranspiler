import {createHash,createHmac} from "node:crypto";
export const hash=createHash("sha256");
export const hmac=createHmac("sha256","key");
export async function finish(input:string):Promise<string>{
 const localHash=createHash("sha3-256"),localHmac=createHmac("sha3-256","key");
 await Promise.resolve();
 return localHash.update(input).digest("hex")+":"+localHmac.update(input).digest("hex");
}
