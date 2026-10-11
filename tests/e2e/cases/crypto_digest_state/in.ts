import {createHash,createHmac,getHashes} from "node:crypto";
const hash=createHash("sha3-256").update("abc");
console.log("hash:",hash.digest("hex"));
let finalized=false;try{hash.digest("hex")}catch(error){finalized=error instanceof Error}
console.log("finalized:",finalized);
const hmac=createHmac("blake2s256","").update("abc");
console.log("hmac:",hmac.digest("hex"));
console.log("repeat:",hmac.digest("hex").length);
console.log("available:",getHashes().includes("sha3-256")&&getHashes().includes("blake2s256"));
