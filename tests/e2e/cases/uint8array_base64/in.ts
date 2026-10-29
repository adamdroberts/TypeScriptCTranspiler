const bytes = Uint8Array.fromBase64("aGVsbG8gd29ybGQ=");
console.log(bytes.length, bytes.toHex(), bytes.toBase64(), bytes.toBase64({ alphabet: "base64url", omitPadding: true }));
const target = new Uint8Array(8);
const { read, written } = target.setFromBase64("SGk=", { lastChunkHandling: "strict" });
console.log(read, written, target.toHex());
console.log(Uint8Array.fromHex("cafe").toBase64(), new Uint8Array(2).setFromHex("beef").written);
const toB64 = bytes.toBase64; console.log(toB64.call(bytes.subarray(0, 5)), Uint8Array.fromBase64.name, Uint8Array.fromBase64.length);
try { Uint8Array.fromHex("xy"); } catch (e) { console.log((e as Error).name); }
const partial = new Uint8Array(4);
try { partial.setFromBase64("AQID*"); } catch (e) { console.log((e as Error).name, partial.toHex()); }
console.log(JSON.stringify(new Uint8Array(3).setFromBase64("Zm9vYmFy")), Uint8Array.fromBase64("Zm9vYg", { lastChunkHandling: "stop-before-partial" }).toHex());
