import ordinary from "node:buffer";
import * as namespace from "buffer";
import { Buffer as Named, atob as decode, btoa as encode } from "node:buffer";
const bytes: Buffer = Named.from("owned");
console.log("identity", Named === Buffer, ordinary.Buffer === Named, namespace.Buffer === Named, namespace.default === ordinary);
console.log("bytes", bytes.toString(), Named.byteLength(bytes), decode(encode("A")));
async function main(): Promise<void> {
    const create = Named.from;
    const result: Buffer = Reflect.apply(create, null, [await Promise.resolve("retained")]);
    console.log("stored", result.toString());
    const transcode = ordinary.transcode;
    const converted: Buffer = Reflect.apply(transcode, null, [await Promise.resolve(result), "utf8", "hex"]);
    console.log("profile transcode", converted.toString());
}
main();
