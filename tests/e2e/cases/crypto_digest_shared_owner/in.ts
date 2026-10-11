import {hash,hmac,finish} from "./owner";
async function main():Promise<void>{
 const update=hash.update;
 await Promise.resolve();
 console.log("retained:",update.call(hash,"abc")===hash);
 const original=hash.update;
 let trace="";
 hash.update=function(data:string|Buffer|DataView):CryptoHash{trace=String(data);return hash};
 console.log("mutation:",hash.update("changed")===hash,trace);
 hash.update=original;
 console.log("hash:",hash.digest().toString("hex"));
 console.log("hmac:",hmac.update("abc").digest("hex"));
 console.log("local:",await finish("abc"));
}
main();
