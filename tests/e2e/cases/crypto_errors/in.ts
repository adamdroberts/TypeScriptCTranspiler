import * as crypto from "node:crypto";
function invalidAlgorithm():boolean{
 try{crypto.createHash("not-a-digest");return false}catch(error){return error instanceof Error}
}
function invalidSize():boolean{
 try{crypto.randomBytes(-1);return false}catch(error){return error instanceof RangeError}
}
console.log("createHash:",invalidAlgorithm());
console.log("randomBytes:",invalidSize());
console.log("latin1:",crypto.createHash("sha256").update("abc").digest("latin1").length);
console.log("valid:",crypto.createHash("sha1").update("abc").digest("hex").slice(0,8),crypto.randomBytes(0).length);
